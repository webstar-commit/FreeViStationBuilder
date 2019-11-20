# Freevi Station Builder

##Install
```
npm install
```

##eegeo Map Style set

cp -r ./public_styles ./node_modules/public/

##Run
```
npm run start:dev
```
go to **localhost:3000**

##Deployment
The app is deloyed on the digital ocean server. 
```
ssh ziyang@138.197.38.159
cd ~/apps/deploy/FreeViStationBuilder/bin
sudo ./deploy.sh
sudo docker run -d -p 3008:3008 freevi-nation
```
##Build player
```
clara_urlRoot=https://editor.vimarket.io clara_s3CDNHost='' clara_resourcesCDNHost=d3dxca6whkzkbi.cloudfront.net clara_rollbarBrowserToken=74f3517e176d41cfa5e9c41f446b5531 clara_env=freevination npm run build-client-production-nomin
```
# Android Native App

## Build and Run Cordova with Crosswalk webviewer
Check this guide: https://crosswalk-project.org/documentation/cordova.html
## Enable the webgl on gpu-blacklist device
1. adding a file called xwalk-command-line put the xwalk-command-line file directly into
platforms/android/assets.
2. This file can contain a custom command-line
for your application. To enable WebGL you can tell Crosswalk to ignore the
GPU blacklist:
```xwalk --ignore-gpu-blacklist```

## Install and Uninstall morphus cordova plugin
Install plugin from(/home/zli/Work/ExoProjects/3D_SDK/cordova-plugin-morphus/morphusSDK) into project(/home/zli/Work/ExoProjects/3D_SDK/freeviStationBuilder/platforms/android/).
```
plugman install --platform android --project /home/zli/Work/ExoProjects/3D_SDK/freeviStationBuilder/platforms/android/ --plugin /home/zli/Work/ExoProjects/3D_SDK/cordova-plugin-morphus/morphusSDK
```
 Uninstall plugin (id:cordova-plugin-morphus)
```
 plugman uninstall --platform android --project /home/zli/Work/ExoProjects/3D_SDK/freeviStationBuilder/platforms/android/ --plugin cordova-plugin-morphus
 ```


## Publish the APK on google play
 1. Build the release
 ```
 cordova build android --release
 ```

 2. Sign the apk

  create a key using
 ```
 keytool -genkey -v -keystore my-release-key.keystore -alias alias_name -keyalg RSA -keysize 2048 -validity 10000
 ```
  then sign the apk using
 ```
 jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore my_application.apk alias_name
 ```

 3. Zip align the apk
 https://developer.android.com/studio/command-line/zipalign.html
   ```
   zipalign -f -v 4 infile.apk outfile.apk
   ```
 4. Self updating

 Update the apk.json and .apk file to aws s3 staionbuilder-files bucket.
