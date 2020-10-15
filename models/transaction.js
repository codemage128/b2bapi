/* 
* txn Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : txn.js
*/ 


var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME );
var Schema = mongoose.Schema;
//Schema

var transactionSchema = new Schema({
  time : {type : Date, default : Date.now, required : true, index : true},
  account : {type : Schema.Types.ObjectId, required : true, index : true},
  type : {type : String, enum : ['crd', 'deb'], required : true, index : true},
  wallet_id : {type : String, index : true},
  balance_after : String,
  amount : String,
  currency : String,
  description : String,
  target : String,
  source : String
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
transactionSchema.plugin(mongoosePaginate);
//Return model
module.exports = db.model('transaction', transactionSchema);


/*
1. Dashboard  (Daily, Weekly, Monthly, Yearly) for Agents and Wholesalers, Wholesaler Dashboard items
2. PIN Information in topup-logs OK
3. Balance movement in transactions OK
4. Account column in transaction view  OK
5. PIN Search option by caller id and target, with option to download list via CSV OK
6. fix sidebar (grey stuff you requested)
7. Mapping interface for Core. OK 
8. /apidoc update
9. IVR used and invalid needs to be clear, fix will be applied.
*/
