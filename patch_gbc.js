const fs = require('fs');
const file = 'src/components/GbcDisplay.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { RamViewer }')) {
  content = content.replace(
    "import { Play, Pause, FastForward, Volume2, VolumeX, Camera } from 'lucide-react';",
    "import { Play, Pause, FastForward, Volume2, VolumeX, Camera } from 'lucide-react';\nimport { RamViewer } from './RamViewer';"
  );
  
  content = content.replace(
    "{/* No Rom Loaded State */}",
    "{/* No Rom Loaded State */}"
  );
  
  // We need to insert it below the closing div of the `relative aspect-[10/9]...`
  // But wait, it's easier to just do it via string split.
  
  const endDivSplit = content.split('      </div>\n    </div>\n  );\n}\n');
  if (endDivSplit.length === 2) {
    content = endDivSplit[0] + '      </div>\n      <RamViewer emulator={emulator} />\n    </div>\n  );\n}\n';
    fs.writeFileSync(file, content);
    console.log("Patched GbcDisplay.tsx");
  } else {
    console.log("Could not find insertion point.");
  }
}
