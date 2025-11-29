const fs = require('fs');
const path = require('path');

function checkAsset(filePath) {
  const fullPath = path.join(__dirname, filePath);

  console.log("Checking:", fullPath);

  if (fs.existsSync(fullPath)) {
    console.log("✔ File exists!");

    // prøv at læse den:
    try {
      const data = fs.readFileSync(fullPath);
      console.log("✔ File is readable. Size:", data.length, "bytes");
    } catch (err) {
      console.log("✖ File exists, but could NOT be read:", err);
    }

  } else {
    console.log("✖ File does NOT exist.");
  }
}

// TEST whatever you want:
checkAsset('./assets/userlogo.png');
checkAsset('./assets/hotspotflame.png');
checkAsset('./assets/maplogo.png');