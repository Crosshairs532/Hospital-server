const mongoose = require('mongoose');

const PatientSchema  = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    age:{
        type:Number,
        required:true
    },
    phone:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:["pending",'confirmed',"cancelled"]
    },
    isEmergency:{
        type:Boolean,
        default:false
    },
    timestamps:true
})