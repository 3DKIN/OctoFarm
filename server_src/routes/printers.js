const express = require("express");

const router = express.Router();
const { ensureAuthenticated } = require("../config/auth");
// User Modal
const runner = require("../runners/state.js");

const { Runner } = runner;
const Logger = require("../lib/logger.js");

const logger = new Logger("OctoFarm-API");
const printerClean = require("../lib/dataFunctions/printerClean.js");

const { PrinterClean } = printerClean;

const { Script } = require("../lib/serverCommands.js");

const _ = require("lodash");

/* //Login Page
router.get("/login", (req, res) => res.render("login"));
//Register Page
router.get("/register", (req, res) => res.render("register")); */
router.post("/add", ensureAuthenticated, async (req, res) => {
  // Grab the API body
  const printers = req.body;
  // Send Dashboard to Runner..
  logger.info("Update printers request: ", printers);
  const p = await Runner.addPrinters(printers);
  // Return printers added...
  res.send({ printersAdded: p, status: 200 });
});
router.post("/update", ensureAuthenticated, async (req, res) => {
  // Grab the API body
  const printers = req.body;
  // Send Dashboard to Runner..
  logger.info("Update printers request: ", printers);
  const p = await Runner.updatePrinters(printers);
  // Return printers added...
  res.send({ printersAdded: p, status: 200 });
});
router.post("/remove", ensureAuthenticated, async (req, res) => {
  // Grab the API body
  const printers = req.body;
  // Send Dashboard to Runner..
  logger.info("Delete printers request: ", printers);
  const p = await Runner.removePrinter(printers);
  // Return printers added...
  res.send({ printersRemoved: p, status: 200 });
});

// Register Handle for Saving printers
router.post("/removefile", ensureAuthenticated, async (req, res) => {
  // Check required fields
  const file = req.body;
  logger.info("File deletion request: ", file.i);
  Runner.removeFile(file.i, file.fullPath);
  res.send("success");
});
router.post("/removefolder", ensureAuthenticated, async (req, res) => {
  // Check required fields
  const folder = req.body;
  logger.info("Folder deletion request: ", folder.fullPath);
  Runner.deleteFolder(folder.index, folder.fullPath);
  res.send(true);
});
router.post("/resyncFile", ensureAuthenticated, async (req, res) => {
  // Check required fields
  const file = req.body;
  logger.info("File Re-sync request for: ", file);
  let ret = null;
  console.log(file);
  if (typeof file.fullPath !== "undefined") {
    ret = await Runner.reSyncFile(file.i, file.fullPath);
  } else {
    ret = await Runner.getFiles(file.i, "files?recursive=true");
  }
  setTimeout(function () {
    res.send(ret);
  }, 5000);
});
router.post("/stepChange", ensureAuthenticated, async (req, res) => {
  // Check required fields
  const step = req.body;
  Runner.stepRate(step.printer, step.newSteps);
  res.send("success");
});
router.post("/flowChange", ensureAuthenticated, async (req, res) => {
  // Check required fields
  const step = req.body;
  Runner.flowRate(step.printer, step.newSteps);
  res.send("success");
});
router.post("/feedChange", ensureAuthenticated, async (req, res) => {
  // Check required fields
  const step = req.body;
  Runner.feedRate(step.printer, step.newSteps);
  res.send("success");
});
router.post("/updateSettings", ensureAuthenticated, async (req, res) => {
  // Check required fields

  const settings = req.body;
  logger.info("Update printers request: ", settings);
  const updateSettings = await Runner.updateSettings(settings);
  res.send({ status: updateSettings.status, printer: updateSettings.printer });
});
router.get("/groups", ensureAuthenticated, async (req, res) => {
  const printers = await Runner.returnFarmPrinters();
  const groups = [];
  for (let i = 0; i < printers.length; i++) {
    await groups.push({
      _id: printers[i]._id,
      group: printers[i].group,
    });
  }

  res.send(groups);
});
router.post("/printerInfo", ensureAuthenticated, async (req, res) => {
  const id = req.body.i;

  const printers = await PrinterClean.returnPrintersInformation();
  if (typeof id === "undefined" || id === null) {
    res.send(printers);
  } else {
    const index = _.findIndex(printers, function (o) {
      return o._id == id;
    });
    const returnPrinter = {
      printerName: printers[index].printerName,
      apikey: printers[index].apikey,
      _id: printers[index]._id,
      printerURL: printers[index].printerURL,
      storage: printers[index].storage,
      fileList: printers[index].fileList,
      systemChecks: printers[index].systemChecks,
    };
    res.send(returnPrinter);
  }
});

// Register handle for checking for offline printers - Depricated due to websocket full implementation
router.post("/runner/checkOffline", ensureAuthenticated, async (req, res) => {
  const printers = await Runner.returnFarmPrinters();
  for (let i = 0; i < printers.length; i++) {
    const reset = await Runner.reScanOcto(i);
  }
  res.send({
    printers: "All",
    msg: " Were successfully rescanned...",
  });
});

router.post("/moveFile", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  if (data.newPath === "/") {
    data.newPath = "local";
    data.newFullPath = data.newFullPath.replace("//", "");
  }
  logger.info("Move file request: ", data);
  Runner.moveFile(data.index, data.newPath, data.newFullPath, data.fileName);
  res.send({ msg: "success" });
});
router.post("/moveFolder", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  logger.info("Move folder request: ", data);
  Runner.moveFolder(
    data.index,
    data.oldFolder,
    data.newFullPath,
    data.folderName
  );
  res.send({ msg: "success" });
});
router.post("/newFolder", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  logger.info("New folder request: ", data);
  Runner.newFolder(data);
  res.send({ msg: "success" });
});
router.post("/newFiles", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  logger.info("Adding a new file to server: ", data);
  Runner.newFile(data);
  res.send({ msg: "success" });
});
router.post("/selectFilament", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  logger.info("Change filament request: ", data);
  const roll = await Runner.selectedFilament(data);
  res.send({ msg: roll });
});
router.post("/reScanOcto", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  if (data.id === null) {
    logger.info("Rescan All OctoPrint Requests: ", data);
    const printers = await Runner.returnFarmPrinters();
    for (let i = 0; i < printers.length; i++) {
      await Runner.reScanOcto(printers[i]._id);
    }
    logger.info("Full re-scan of OctoFarm completed");
    res.send({ msg: "Started a full farm rescan." });
  } else {
    logger.info("Rescan OctoPrint Requests: ", data);
    const reScan = await Runner.reScanOcto(data.id);
    logger.info("Rescan OctoPrint complete: ", reScan);
    res.send({ msg: reScan });
  }
});
router.post("/wakeHost", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  logger.info("Action wake host: ", data);
  Script.wol(data);
});
router.post("/updateSortIndex", ensureAuthenticated, async (req, res) => {
  const data = req.body;
  logger.info("Update filament sorting request: ", data);
  Runner.updateSortIndex(data);
});
router.get("/connectionLogs/:id", ensureAuthenticated, async (req, res) => {
  let id = req.params.id;
  logger.info("Grabbing connection logs for: ", id);
  let connectionLogs = await Runner.returnPrinterLogs(id);

  res.send(connectionLogs);
});
router.get("/pluginList/:id", ensureAuthenticated, async (req, res) => {
  let id = req.params.id;
  console.log(id);
  if (id !== "all") {
    logger.info("Grabbing plugin list for: ", id);
    let pluginList = await Runner.returnPluginList(id);
    res.send(pluginList);
  } else {
    logger.info("Grabbing global plugin list");
    let pluginList = await Runner.returnPluginList();
    res.send(pluginList);
  }
});
router.get("/scanNetwork", ensureAuthenticated, async (req, res) => {
  const {
    searchForDevicesOnNetwork,
  } = require("../../server_src/runners/autoDiscovery.js");

  let devices = await searchForDevicesOnNetwork();

  res.json(devices);
});

module.exports = router;
