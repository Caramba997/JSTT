const { Random } = require('../lib/random.js');
const fs = require('fs');

const settings = {
  total: 384,
  min: 1,
  max: 593760
};

const random = new Random();

(async () => {
  console.log(`Generating ${settings.total} random numbers in the range of ${settings.min} to ${settings.max}`);
  const randoms = await random.get(settings.total, settings.min, settings.max);
  const filename = `randoms_${settings.total}-${settings.min}to${settings.max}_${Date.now()}.txt`;
  const path = `${process.cwd()}/results/randoms/${filename}`;
  fs.writeFileSync(path, randoms.toString());
  console.log(`Outputted randoms to ${path}`);
  const remainingQuota = await random.quota();
  console.log(`Remaining quota: ${remainingQuota} bits`);
})();