const nodeCrone = require('node-cron')
const mailWorker = require('../notification/mailWorker')


let now = new Date();



module.exports.scheduler = {
    run: ()=>{
            nodeCrone.schedule('00 * * * * *', function(){
            console.log('Mail Worker starting...');
            mailWorker.run();
            console.log('Mail Worker started.');
    })
}
}
