var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");
var aws = require("aws-sdk");

var config = require("../config");

var fsUtil = (() => {
  const regions = config.sqs.regions;
  const accessKeyId = config.sqs.access_key_id;
  const secretAccessKey = config.sqs.secret_access_key;

  /**
   * 파일 존재 여부 조회
   * @param  {string}   filePath 파일 경로
   * @param  {Function} callback 콜백 함수
   */
  var getStats = function(filePath, callback) {
    fs.stat(filePath, function(err, stats) {
      if (err) {
        callback(null, false);
      } else {
        callback(null, true, stats);
      }
    });
  };

  /**
   * 파일 업로드
   * @param  {string}   file     파일 경로
   * @param  {[type]}   filePath 업로드 경로
   * @param  {Function} callback 콜백 함수
   */
  var uploadFile2Local = function(file, filePath, callback) {
    fs.readFile(file.path, function(err, data) {
      if (err) {
        callback(err);
      } else {
        var now = moment().format("YYYYMMDDHHmmss");
        var fileName = file.name + "_" + now;

        fs.writeFile(filePath, data, function(err) {
          if (err) {
            callback(err);
          } else {
            var uploadResult = {
              fileName: fileName,
              filePath: filePath + "/" + fileName
            };

            callback(null, uploadResult);
          }
        });
      }
    });
  };

  /**
   * 파일 업로드
   * @param  {string}   file     파일 경로
   * @param  {string}   bucket   업로드 버킷
   * @param  {string}   s3Path   업로드 디렉토리 경로
   * @param  {Function} callback 콜백 함수
   */
  var uploadFile = function(file, bucket, s3Path, callback) {
    aws.config.update({
      region: regions[0],
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    });
    var s3 = new aws.S3();

    getStats(file, function(err, isExist, stats) {
      if (err) {
        callback(err);
      } else {
        if (isExist) {
          fs.readFile(file, function(err, data) {
            if (err) {
              callback(err);
            } else {
              var name = file.substring(
                file.lastIndexOf(path.sep) + 1,
                file.length
              );

              // S3 저장 파라미터 세팅
              var params = {
                Bucket: bucket,
                Key: s3Path + "/" + name,
                Body: data
              };

              s3.putObject(params, function(err, data) {
                if (err) {
                  callback(err);
                } else {
                  var uploadResult = {
                    fileName: name,
                    filePath: s3Path + "/" + name
                  };

                  callback(null, uploadResult);
                }
              }); // putObject
            }
          }); // readFile
        } else {
          callback("ERR_NO_SUCH_FILE_OR_DIRECTORY");
        }
      }
    });
  };

  /**
   * 파일 업로드
   * @param  {string}   bucket   다운로드 버킷
   * @param  {string}   s3Path   다움로드 파일 경로
   * @param  {Function} callback 콜백 함수
   */
  var downloadFile = function(bucket, s3Path, callback) {
    aws.config.update({
      region: regions[0],
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    });
    var s3 = new aws.S3();

    var params = {
      Bucket: bucket,
      Key: s3Path
    };

    var downloadFile = fs.createWriteStream(__dirname + "/../" + s3Path);

    downloadFile.on("close", function() {
      callback(null);
    }); // close

    s3.getObject(params)
      .createReadStream()
      .on("error", function(err) {
        callback(err);
      })
      .pipe(downloadFile); //getObject
  };

  /**
   * 디렉터리 생성
   * @param  {string}   dirPath  파일 디렉터리 경로
   * @param  {Function} callback 콜백 함수
   */
  var makeDir = function(dirPath, callback) {
    getStats(dirPath, function(err, exist, stats) {
      if (err) {
        callback(err);
      } else {
        if (exist) {
          callback(null);
        } else {
          mkdirp(dirPath, callback);
        }
      }
    }); // getStats
  };

  /**
   * 파일 읽기
   * @param  {string}   filePath 파일 경로
   * @param  {Function} callback 콜백 함수
   */
  var readFile = function(filePath, callback) {
    fs.readFile(filePath, callback);
  };

  /**
   * 파일 쓰기
   * @param  {string}   filePath 파일 경로
   * @param  {string}   content  파일 내용
   * @param  {Function} callback 콜백 함수
   */
  var writeFile = function(filePath, content, callback) {
    fs.writeFile(filePath, content, callback);
  };

  /**
   * 파일 지우기
   * @param  {string}   filePath 파일 경로
   * @param  {Function} callback 콜백 함수
   */
  var removeFile = function(filePath, callback) {
    fs.unlink(filePath, callback);
  };

  /**
   * 디렉토리 읽기
   * @param  {string}   filePath 파일 경로
   * @param  {Function} callback 콜백 함수
   */
  var readDir = function(filePath, callback) {
    fs.readdir(filePath, function(err, files) {
      if (err) {
        callback(err);
      } else {
        for (var idx = 0; idx < files.length; idx++) {
          if (files[idx] === "." || files[idx] === "..") {
            files.splice(idx, 1);
          }
        }

        callback(null, files);
      }
    }); // readdir
  };

  return {
    getStats: getStats,
    uploadFile: uploadFile,
    downloadFile: downloadFile,
    uploadFile2Local: uploadFile2Local,
    makeDir: makeDir,
    writeFile: writeFile,
    readFile: readFile,
    removeFile: removeFile,
    readDir: readDir
  };
})();

if (exports) {
  module.exports = fsUtil;
}
