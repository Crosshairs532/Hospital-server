const nodemailer = require('nodemailer')
const moment = require('moment')
const dotenv = require('dotenv')

dotenv.config()

const mailWorker = function() {
    return {
      run: function() {
        const appointments = getAppointments();
        sendEmail(appointments);

      },
    };
  };

  const getAppointments = async()=>{
    const {MongoClient,ServerApiVersion} = require('mongodb')
    try{
        const client = new MongoClient(process.env.MNGO_URI,{serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
      }});
    
      await client.connect();
      console.log("MongoDb connected successfully for worker");
      const appointmentCollection = client.db('hospitalDb').collection('allAppointments');
      const appointments = await appointmentCollection.find().toArray();

      return appointments.filter(appointment=>requiresNotification(appointment.ATime));

    }
   catch(err){
    console.log("Error :"+err);
   }
  }

  
const requiresNotification = (time)=>{
  return Math.round(moment.duration(moment(time).tz(this.timeZone).utc()
  .diff(moment(now).utc())).asMinutes()) === 30;
}
  

const sendEmail = (appointments)=>{
  const transorter = nodemailer.createTransport({
    service:'gmail',
    auth:{
      user:process.env.EMAIL,
      pass:process.env.EMAIL_PASSWORD
    }
  })

  appointments.forEach(appointment=>{
    let date = Date(appointment.ATime);
    const mailOptions = {
      from:process.env.EMAIL,
      to:appointment.Pemail,
      subject:"Appointment Remainder",
      text:`You have an appointment with ${appointment.Dname} at ${date}`,
    }

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
  })})
}

module.exports = mailWorker();