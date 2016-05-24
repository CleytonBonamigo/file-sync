var fsSync = require('fs-sync');
var config = fsSync.readJSON('config.json');

var sync = require('./sync.js');

/*
	Inicia o script e, se não tiver configurado os caminhos, mostra erro e cai fora.
*/
if(!config.source_path || !config.destination_path){
	console.log('Por favor, configure os caminhos das pastas');
	return false;
}else{
	sync.removeFile('./application.log');
	sync.logFile = true;
	sync.logConsole = true;

	sync.maxReadFileSize = 100;

	/*Manda como parâmetro:  source_path, destination_path, options (default false) callback*/
	//sync.copy(config.source_path, config.destination_path, {force: true}, sync.watchFolder);

	sync.init();
}