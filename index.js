const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const tmp = require("tmp");
const path = require("path");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.get("/", async (req, res) => {
  res.send("Hello");
});

app.post("/protect", upload.single("pdf"), async (req, res) => {
  if (!req.file || !req.body.password) {
    return res.status(400).send("PDF file and password are required.");
  }

  const password = req.body.password;

  // Create temporary files
  const inputTmp = tmp.fileSync({ postfix: ".pdf" });
  const outputTmp = tmp.fileSync({ postfix: ".pdf" });

  try {
    // Write incoming PDF buffer to temp input file
    fs.writeFileSync(inputTmp.name, req.file.buffer);

    // Run qpdf to apply password protection
    const cmd = `qpdf --encrypt "" "${password}" 256 --print=full --modify=none --extract=n --accessibility=y -- "${inputTmp.name}" "${outputTmp.name}"`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr, err);
        return res.status(500).send("Failed to protect PDF");
      }

      // Read and send protected PDF
      const protectedBuffer = fs.readFileSync(outputTmp.name);
      res.setHeader("Content-Type", "application/pdf");
      //   res.setHeader(
      //     "Content-Disposition",
      //     "attachment; filename=protected.pdf",
      //   );
      res.setHeader("Content-Disposition", "inline; filename=protected.pdf");
      res.send(protectedBuffer);

      // Clean up
      inputTmp.removeCallback();
      outputTmp.removeCallback();
    });
  } catch (error) {
    inputTmp.removeCallback();
    outputTmp.removeCallback();
    res.status(500).send("Something went wrong");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port 3000");
});
