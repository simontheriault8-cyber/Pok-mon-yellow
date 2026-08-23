// Universal A* (A-Star) & BFS Pathfinding Engine for Pokemon Gen 1
// Computes optimal route between (startX, startY) and (targetX, targetY) using live RAM collision matrix.

export type StepDirection = 'up' | 'down' | 'left' | 'right';

export interface PathStep {
  x: number;
  y: number;
  direction: StepDirection;
}

export interface PathResult {
  found: boolean;
  steps: PathStep[];
  totalCost: number;
  targetCoords: { x: number; y: number };
}

interface Node {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to target
  f: number; // g + h
  parent: Node | null;
  direction: StepDirection | null;
}

export class AStarPathfinder {
  /**
   * Calculates the shortest and safest path on the collision grid from (startX, startY) to (targetX, targetY).
   * If the target tile itself is an interactive obstacle (like Nurse Joy behind the counter or a solid door header),
   * it targets the closest walkable adjacent tile.
   */
  public static findPath(
    collisionGrid: number[][],
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    allowAdjacentTarget: boolean = true
  ): PathResult {
    const height = collisionGrid.length;
    if (height === 0) return { found: false, steps: [], totalCost: 0, targetCoords: { x: targetX, y: targetY } };
    const width = collisionGrid[0].length;

    // Check bounds
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
      return { found: false, steps: [], totalCost: 0, targetCoords: { x: targetX, y: targetY } };
    }

    // Check if target is already reached
    if (startX === targetX && startY === targetY) {
      return { found: true, steps: [], totalCost: 0, targetCoords: { x: targetX, y: targetY } };
    }

    // If target is inside an obstacle (e.g. nurse at Y=2 behind counter), find closest adjacent walkable tile
    let effectiveTargetX = targetX;
    let effectiveTargetY = targetY;

    if (
      allowAdjacentTarget &&
      effectiveTargetY < height &&
      effectiveTargetX < width &&
      collisionGrid[effectiveTargetY][effectiveTargetX] === Infinity
    ) {
      const adjacentTiles = [
        { x: targetX, y: targetY + 1 }, // South of target (e.g. (3, 3) facing (3, 2))
        { x: targetX, y: targetY - 1 }, // North
        { x: targetX - 1, y: targetY }, // West
        { x: targetX + 1, y: targetY }, // East
      ];

      let bestAdj: { x: number; y: number } | null = null;
      let minAdjDist = Infinity;

      for (const adj of adjacentTiles) {
        if (
          adj.y >= 0 &&
          adj.y < height &&
          adj.x >= 0 &&
          adj.x < width &&
          collisionGrid[adj.y][adj.x] !== Infinity
        ) {
          const d = Math.abs(adj.x - startX) + Math.abs(adj.y - startY);
          if (d < minAdjDist) {
            minAdjDist = d;
            bestAdj = adj;
          }
        }
      }

      if (bestAdj) {
        effectiveTargetX = bestAdj.x;
        effectiveTargetY = bestAdj.y;
      }
    }

    const openSet: Node[] = [];
    const closedSet: Set<string> = new Set();
    const gScore: Map<string, number> = new Map();

    const startNode: Node = {
      x: startX,
      y: startY,
      g: 0,
      h: AStarPathfinder.heuristic(startX, startY, effectiveTargetX, effectiveTargetY),
      f: AStarPathfinder.heuristic(startX, startY, effectiveTargetX, effectiveTargetY),
      parent: null,
      direction: null,
    };

    openSet.push(startNode);
    gScore.set(`${startX},${startY}`, 0);

    const neighbors: { dx: number; dy: number; dir: StepDirection }[] = [
      { dx: 0, dy: -1, dir: 'up' },
      { dx: 0, dy: 1, dir: 'down' },
      { dx: -1, dy: 0, dir: 'left' },
      { dx: 1, dy: 0, dir: 'right' },
    ];

    let closestNodeToTarget: Node = startNode;
    let closestDistance = startNode.h;

    while (openSet.length > 0) {
      // Find node with lowest f score
      let lowestIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIndex].f) {
          lowestIndex = i;
        }
      }

      const current = openSet.splice(lowestIndex, 1)[0];
      const currentKey = `${current.x},${current.y}`;

      // Goal reached
      if (current.x === effectiveTargetX && current.y === effectiveTargetY) {
        return AStarPathfinder.reconstructPath(current, { x: effectiveTargetX, y: effectiveTargetY });
      }

      closedSet.add(currentKey);

      // Track closest node in case full path is unreachable
      if (current.h < closestDistance) {
        closestDistance = current.h;
        closestNodeToTarget = current;
      }

      // Explore 4 adjacent neighbors
      for (const n of neighbors) {
        const nx = current.x + n.dx;
        const ny = current.y + n.dy;
        const nKey = `${nx},${ny}`;

        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        if (closedSet.has(nKey)) continue;

        const tileCost = collisionGrid[ny][nx];
        if (tileCost === Infinity) continue; // Blocked by wall/tree/obstacle

        // Standard movement base cost is 1, plus any tile penalty (e.g. high grass = +1)
        const tentativeG = current.g + 1 + tileCost;
        const previousG = gScore.get(nKey);

        if (previousG === undefined || tentativeG < previousG) {
          gScore.set(nKey, tentativeG);
          const h = AStarPathfinder.heuristic(nx, ny, effectiveTargetX, effectiveTargetY);
          const neighborNode: Node = {
            x: nx,
            y: ny,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: current,
            direction: n.dir,
          };

          const existingIndex = openSet.findIndex((node) => node.x === nx && node.y === ny);
          if (existingIndex >= 0) {
            openSet[existingIndex] = neighborNode;
          } else {
            openSet.push(neighborNode);
          }
        }
      }
    }

    // If exact target unreachable, return path to closest reachable position
    if (closestNodeToTarget !== startNode) {
      return AStarPathfinder.reconstructPath(closestNodeToTarget, {
        x: closestNodeToTarget.x,
        y: closestNodeToTarget.y,
      });
    }

    return { found: false, steps: [], totalCost: 0, targetCoords: { x: effectiveTargetX, y: effectiveTargetY } };
  }

  private static heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  private static reconstructPath(endNode: Node, targetCoords: { x: number; y: number }): PathResult {
    const steps: PathStep[] = [];
    let curr: Node | null = endNode;

    while (curr && curr.parent && curr.direction) {
      steps.unshift({
        x: curr.x,
        y: curr.y,
        direction: curr.direction,
      });
      curr = curr.parent;
    }

    return {
      found: true,
      steps,
      totalCost: endNode.g,
      targetCoords,
    };
  }
}
