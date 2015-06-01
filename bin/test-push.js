var ionicPushServer = require('ionic-push-server');

var credentials = {
    IonicApplicationID : "ionic_app_id",
    IonicApplicationAPIsecret : "ionic_app_private_key"
};

var notification = {
  "tokens":["myDeviceToken"],
  "notification":{
    "alert":"Hi from Ionic Push Service!",
    "ios":{
      "badge":1,
      "sound":"chime.aiff",
      "expiry": 1423238641,
      "priority": 10,
      "contentAvailable": true,
      "payload":{
        "key1":"value",
        "key2":"value"
      }
    }
  } 
};

ionicPushServer(credentials, notification);
