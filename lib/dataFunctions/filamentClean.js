

const ServerSettings = require("../../models/ServerSettings.js");
const Spools = require("../../models/Filament.js");
const Profiles = require("../../models/Profiles.js");
const runner = require("../../runners/state.js");
const Runner = runner.Runner;
const _ = require("lodash");



let spoolsClean = [];
let profilesClean = [];
let statisticsClean = [];
let interval = false;

if(interval === false){
    interval = setInterval(function() {
        FilamentClean.start();
    }, 10000);
}

class FilamentClean{
    static getSpools(){
        return spoolsClean;
    }
    static getProfiles(){
        return profilesClean;
    }
    static getStatistics(){
        return statisticsClean;
    }
    static async start() {
        let serverSettings = await ServerSettings.find({});
        let profiles = await Profiles.find({});
        let spools = await Spools.find({});
        let spoolsArray = [];
        let profilesArray = [];
        let statisticsObject = {};
        for(let pr = 0; pr < profiles.length; pr++){
            let profile = {
                _id: null,
                manufacturer: profiles[pr].profile.manufacturer,
                material: profiles[pr].profile.material,
                density: profiles[pr].profile.density,
                diameter: profiles[pr].profile.diameter,
            }
            if(serverSettings[0].filamentManager){
                profile._id = profiles[pr].profile.index
            }else{
                profile._id = profiles[pr]._id
            }
            profilesArray.push(profile)
        }
        for (let sp = 0; sp < spools.length; sp++) {
            let spool = {
                _id: spools[sp]._id,
                name: spools[sp].spools.name,
                profile: spools[sp].spools.profile,
                price: spools[sp].spools.price,
                weight: spools[sp].spools.weight,
                used: spools[sp].spools.used,
                remaining: spools[sp].spools.weight - spools[sp].spools.used,
                percent: (100 - spools[sp].spools.used / spools[sp].spools.weight * 100),
                tempOffset: spools[sp].spools.tempOffset,
                printerAssignment: await FilamentClean.getPrinterAssignment(spools[sp]._id),
                fmID: spools[sp].spools.fmID,
            }
            spoolsArray.push(spool);
        }
        spoolsClean = spoolsArray;
        profilesClean = profilesArray;
        let statistics = await FilamentClean.createStatistics(spoolsArray, profilesArray);
        statisticsClean = statistics;
    }
    static async createStatistics(spools, profiles){
        let materials = [];
        let materialBreak = [];

        profiles.forEach(profiles => {
            materials.push(profiles.material.replace(/ /g, "_"));
            let material = {
                name: profiles.material.replace(/ /g, "_"),
                weight: [],
                used: [],
                price: [],
            }
            materialBreak.push(material)
        })
        materialBreak = _.uniqWith(materialBreak, _.isEqual)

        let used = [];
        let total = [];
        let price = [];

        spools.forEach(spool => {
            used.push(parseFloat(spool.used))
            total.push(parseFloat(spool.weight))
            price.push(parseFloat(spool.price))
            let profInd = _.findIndex(profiles, function(o) { return o._id == spool.profile; });
            let index = _.findIndex(materialBreak, function(o) { return o.name == profiles[profInd].material.replace(/ /g, "_"); });

            materialBreak[index].weight.push(parseFloat(spool.weight));
            materialBreak[index].used.push(parseFloat(spool.used));
            materialBreak[index].price.push(parseFloat(spool.price));
        })
        let materialBreakDown = []
        materialBreak.forEach(material => {
            let mat = {
                name: material.name,
                used: material.used.reduce((a, b) => a + b, 0),
                total: material.weight.reduce((a, b) => a + b, 0),
                price: material.price.reduce((a, b) => a + b, 0),
            }
            materialBreakDown.push(mat)
        })

        return {
            materialList: materials.filter(function (item, i, ar) {
                return ar.indexOf(item) === i;
            }),
            used: used.reduce((a, b) => a + b, 0),
            total: total.reduce((a, b) => a + b, 0),
            price: price.reduce((a,b) => a + b, 0),
            profileCount: profiles.length,
            spoolCount: spools.length,
            materialBreakDown: materialBreakDown
        };


    }
    static async getPrinterAssignment(spoolID){
        let farmPrinters = Runner.returnFarmPrinters();
        let assignments = [];
            for(let p = 0; p < farmPrinters.length; p++) {
                if (Array.isArray(farmPrinters[p].selectedFilament)) {
                    for (let s = 0; s < farmPrinters[p].selectedFilament.length; s++) {
                        if(farmPrinters[p].selectedFilament[s] !== null){
                            if (farmPrinters[p].selectedFilament[s]._id.toString() === spoolID.toString()) {

                                let printer = {
                                    id: farmPrinters[p]._id,
                                    tool: s
                                }
                                assignments.push(printer)
                            }
                        }

                    }
                }
            }
            return assignments
    }
}
module.exports = {
    FilamentClean: FilamentClean
};
FilamentClean.start();