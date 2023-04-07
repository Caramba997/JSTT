// const date =  require('date-and-time');

// let d1 = date.parse('2023-03-01', 'YYYY-MM-DD', true),
//     d2 = date.addMilliseconds(date.addDays(date.parse('2023-03-31', 'YYYY-MM-DD', true), 1), -1);
//     console.log(d1.toISOString(), d2.toISOString());
// console.log(date.subtract(d2, d1).toMilliseconds() / 1000 / 60 / 60 / 24);

// const arr = ["a", "b", "c", "d", "e"];
// arr.splice(arr.indexOf("c"), 1, "x", "y");
// console.log(arr);

(async() => {
  const { GitHub } = require('../lib/github.js');
  
  const gitHub = new GitHub();
  
  const response = await gitHub.getTotalPRs('petruisfan/node-supervisor');
  console.log(response);
})();