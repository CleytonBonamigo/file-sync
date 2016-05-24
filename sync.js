var fs = require('fs');
var fsSync = require('fs-sync');
var node_path = require('path');
var watch = require('node-watch');
var os = require("os");
var walk = require('walk');
var config = fsSync.readJSON('config.json');
var sync = module.exports = {};

sync.logFile = false;
sync.logConsole = false;
sync.maxReadFileSize = 100;

sync.copy = function(file, dest, options, callback){
	if (!options)
		options = {};

	// Just set encoding as `null` to force the file to R/W as a `Buffer`
	options.encoding = null;

	// 'abc/' -> '/xxxx/xxx/abc'
	// 'abc.js' -> '/xxx/xxx/abc.js'
	file = node_path.resolve(file);

	if (fsSync.isFile(file)) {
		var content = fsSync.read(file, options);

		if(sync.logFile === true)
			sync.log('debug', file+' => '+dest);

		if (options.force || !fsSync.exists(dest)) {
			if(sync.compareBinary(file, dest) === false)
				return fsSync.write(dest, content, options);
		}

		return false;

	} else if (fsSync.isDir(file)) {
		var dir = file;
		dest = node_path.resolve(dest);

		fsSync.expand('**', {

			// to get relative paths to dir
			cwd: dir

		}).forEach(function(path) {

			var full_path = node_path.join(dir, path);

			if (fsSync.isFile(full_path)){
				//Se o arquivo existir e for diferente do destino, copia
				fs.stat(node_path.join(dest, path), (err, status) => {
					if(sync.logFile === true)
						sync.log('debug', full_path+' => '+node_path.join(dest, path));

					if(err === null || err.null){ //arquivo existe, faz a comparação se é diferente ou não e salva
						if(sync.compareBinary(full_path, node_path.join(dest, path)) === false)
							fsSync.copy(full_path, node_path.join(dest, path), options);
						
					}else if(err.code == 'ENOENT'){ //arquivo não existe, chama a função que copia
						fsSync.copy(full_path, node_path.join(dest, path), options);
					}else{
						fsSync.log('error', JSON.stringify(status));
					}
				});
			}
		});
	}

	if(typeof(callback) != 'undefined')
		callback();
}

sync.watchFolder = function(){
	watch(config.source_path, function(filename) {
		var fileNameReplaced = filename.replace(/\\/g, '/');
		fileNameReplaced = fileNameReplaced.split(config.source_path).pop();

		//Quando o watch detectar alguma modificação em algum arquivo, chama a função que compara os 2
		if(sync.compareBinary(filename, config.destination_path+fileNameReplaced) === false)
			sync.copy(filename, config.destination_path+fileNameReplaced, {force: true});
	});
}

sync.init = function(){
	var walker  = walk.walk(config.source_path, { followLinks: false });

	walker.on('file', function(root, stat, next) {
		var sourceFile = root + '/' + stat.name;
		var destFile = config.destination_path + sourceFile.replace(config.source_path, '');
		destFile = destFile.replace(/\\/g, '/');
		sourceFile = sourceFile.replace(/\\/g, '/');

		if(typeof config.skip_files !== "undefined"){
			for(var i in config.skip_files){

				if(sourceFile.indexOf(config.skip_files[i]) === -1){
					sync.copy(sourceFile, destFile, {force: true});
				}
				else{
					//Check if it's not on not_remove list
					if(typeof config.not_remove !== "undefined"){
						for(var j in config.not_remove){
							if(config.not_remove[j].indexOf(destFile) !== -1)
								break;
						}
					}

					if(config.skip_files[i].indexOf('.') === -1){ //If it's a folder
						destFile = destFile.substr(0, destFile.indexOf(config.skip_files[i]) + config.skip_files[i].length);
						sync.removeFolderRecursive(destFile);
					}else{
						//Remove File
						sync.removeFile(destFile);
					}

					break; //Stop loop
				}
			}
		}else{
			sync.copy(sourceFile, destFile, {force: true});
		}

		next();
	});

	walker.on('end', function() {
	    //console.log(files);
	    sync.watchFolder
	});
}

/*
	Função que lê o buffer de 2 arquivos e compara seus binários. Retorna se há diferença ou não.
*/
sync.compareBinary = function(source, dest, options){
	var compare;
	if(sync.getFileziseInMegabytes(source) > sync.maxReadFileSize){
		compare = false;
	}else if(!fsSync.isFile(dest)){
		compare = false;
	}else{
		var buff1 = fs.readFileSync(source, 'base64');
		var buff2 = fs.readFileSync(dest, 'base64');

		compare = buff1 === buff2;

		buff1 = buff2 = null;
	}

	//Compara os arquivos pelo seu binário
	return compare;
};

sync.getFileLine = function(path){
	var fd = fs.openSync(source, 'r');
	var bufferSize = 1024;
	var buffer = new Buffer(bufferSize);
};

sync.log = function (level, text){
	var message = '{"level":"'+level+'", "message":"'+text+'", "timestamp": "'+new Date().toLocaleString()+'"},';

	if(sync.logConsole === true)
		console.log(message);

	fs.appendFileSync('./application.log', message + os.EOL);

	return true;
};

sync.sleep = function(s) {
	var e = new Date().getTime() + (s * 1000);

	while (new Date().getTime() <= e) {
		;
	}
};

sync.usleep = function(s) {
	var e = new Date().getTime() + (s / 1000);

	while (new Date().getTime() <= e) {
		;
	}
}

sync.removeFile = function(path){
	if(path.replace('/', '').trim() == ''){
		throw 'Could not remove '+path;
	}

	fs.stat(path, (err, stats) =>{
		if(!err){
			fs.unlinkSync(path);

			if(sync.logFile === true)
				sync.log('remove', path);
		}
	});
};

sync.removeFolderRecursive = function(dirPath) {
	try { var files = fs.readdirSync(dirPath); }
	catch(e) { return; }

	if (files.length > 0){
		for (var i = 0; i < files.length; i++) {
			var filePath = dirPath + '/' + files[i];
			if (fs.statSync(filePath).isFile())
				sync.removeFile(filePath);
			else
				sync.removeFolderRecursive(filePath);
		}
	}

	fs.rmdirSync(dirPath);

	if(sync.logFile === true)
		sync.log('remove', dirPath);
};

sync.getFilesizeInBytes = function(filename) {
	var stats = fs.statSync(filename);

	return stats["size"];
};

sync.getFileziseInMegabytes = function(filename){
	return (sync.getFilesizeInBytes(filename) / 1024) / 1024;
}