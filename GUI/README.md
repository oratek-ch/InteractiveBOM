# Interactive BOM

This project is based on [Interactive BOM](https://github.com/openscopeproject/InteractiveHtmlBom), but being modified to work for eaglecad

## Build instructions for Windows:

1) Install [npm for Windows](https://www.guru99.com/download-install-node-js.html#1).  
2) Clone or download this repo. 
2) Navigate to the folder where did you clone it/unpack it. 
3) Hold Shift + Right Click on **GUI** folder and select *Open command window here* or *Open PowerShell window here*.
4) Type **build.bat** and press *Enter*.
5) All done and you have new index.js file :) .

## Populate with more data

1) Copy a `pcbdata.json` file to this directory and rename it the way you want, but save the filename as a **unique ID**.
2) Open `index.html` and add a new option to the selector (id="files"), using the new **unique ID**
3) Open `src/pcbdata.js` file and add the following:
- require()
- switch case