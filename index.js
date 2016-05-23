var fs = require('fs');
var fsSync = require('fs-sync');
var node_path = require('path');
var watch = require('node-watch');
var config = fsSync.readJSON('config.json');
var sync = module.exports = {};

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

		if (options.force || !fsSync.exists(dest)) {
			return fsSync.write(dest, content, options);
		}

		sync.log('debug', file+' => '+dest);

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
					sync.log('debug', full_path+' => '+node_path.join(dest, path), true);

					sync.sleep(5);

					if(err === null || err.null){ //arquivo existe, faz a comparação se é diferente ou não e salva
						if(sync.compareBinary(full_path, node_path.join(dest, path)) === false){
							fsSync.copy(full_path, node_path.join(dest, path), options);
						}
					}else if(err.code == 'ENOENT'){ //arquivo não existe, chama a função que copia
						fsSync.copy(full_path, node_path.join(dest, path), options);
					}else{
						console.log('Some other error: ', err.code, err, stat);
						console.log(err);
						console.log(stat);
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

/*
	Função que lê o buffer de 2 arquivos e compara seus binários. Retorna se há diferença ou não.
*/
sync.compareBinary = function(source, dest, options){
	var buff1 = fs.readFileSync(source);
	var buff2 = fs.readFileSync(dest);

	//Compara os arquivos pelo seu binário
	return buff1.toString('binary') === buff2.toString('binary');
};

sync.log = function (level, text, debug){
	var message = '{"level":"'+level+'", "message":"'+text+'", "timestamp": "'+new Date().toLocaleString()+'"}';

	if(debug)
		console.log(message);

	fs.appendFile('application.log', message+"\n", {flag: 'a'}, (err) => {
		if(err !== null)
			console.log(err);
	});

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
	fs.stat(path, (err, stats) =>{
		if(!err){
			fs.unlink(path, (error, file) => {

			});
		}
	});
};

/*
	Inicia o script e, se não tiver configurado os caminhos, mostra erro e cai fora.
*/
if(!config.source_path || !config.destination_path){
	console.log('Por favor, configure os caminhos das pastas');
	return false;
}else{
	sync.removeFile('application.log');

	/*Manda como parâmetro:  source_path, destination_path, options (default false) callback*/
	sync.copy(config.source_path, config.destination_path, {force: true}, sync.watchFolder);
}