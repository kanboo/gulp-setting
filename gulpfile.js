var gulp = require('gulp');
var $ = require('gulp-load-plugins')(); //簡化 gulp 載入流程
/* 因有載入gulp-load-plugins，可簡化開頭為gulp的插件，改用 $字 代表
var jade = require('gulp-jade'); //HTML 樣板語言
var sass = require('gulp-sass'); //sass
var plumber = require('gulp-plumber'); //讓 Gulp 在運行的過程中遇錯不會中斷
var postcss = require('gulp-postcss'); //強大的 CSS 後處理器
 */
// 下列套件，因非gulp的套件，故無法簡化
var autoprefixer = require('autoprefixer'); //自動為你的 CSS 補上前綴詞
var mainBowerFiles = require('main-bower-files'); //同步bower下載外部檔案
var browserSync = require('browser-sync').create(); //同步bower下載外部檔案
var minimist = require('minimist') //取得輸入gulp指令後面帶的 參數
var gulpSequence = require('gulp-sequence') //依序執行 任務
var htmlmin = require('gulp-htmlmin'); //對HTML代碼進行壓縮
var htmlclean = require('gulp-htmlclean'); //對HTML進行代碼清理，去除不必要的空行等


/* 設定參數之預設值 */
var envOptions = {
    string: 'env',
    default: {
        env: 'develop'
    }
}

var Options = minimist(process.argv.slice(2), envOptions)

//清除資料夾
gulp.task('clean', function () {
    return gulp.src(['./.tmp', './public'], {
            read: false
        })
        .pipe($.clean());
});

/* 預執行下列copyHTML任務的話，在command 輸入 'gulp [任務名稱]' 即可執行*/
gulp.task('copyHTML', function () {
    /* 將 資料複製 至 新地方 */
    /* gulp.src('資料來源')  */
    /* .pie -> 可連續執行多個指令的串接*/
    /* gulp.dest('輸出目標至某資料夾')› */
    return gulp.src('./source/**/*.html')
        .pipe(gulp.dest('./public/'))
        .pipe(browserSync.stream());
})

/* 壓縮 html */
gulp.task('minify-html', function () {
    return gulp.src('./source/**/*.html')
        .pipe(htmlclean()) //對HTML進行代碼清理，去除不必要的空行等
        .pipe(htmlmin({ //對HTML代碼進行壓縮
            removeComments: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
        }))
        .pipe(gulp.dest('./public/'))
});


/* gulp-jade - HTML 樣板語言 */
gulp.task('jade', function () {
    //  var YOUR_LOCALS = {};

    gulp.src('./source/*.jade')
        .pipe($.plumber()) //出錯不中斷，指令加在src後即可
        .pipe($.jade({
            //  locals: YOUR_LOCALS，可額外設定參數
            pretty: true //將HTML縮排排好，不要壓縮
        }))
        .pipe(gulp.dest('./public/'))
        .pipe(browserSync.stream())
});

/* gulp-sass - 強大的 CSS 預處理器 */
gulp.task('sass', function () {
    //gulp-postcss的延伸套件
    var plugins = [
        autoprefixer({
            browsers: ['last 5 version']
        }),
    ];

    return gulp.src('./source/scss/**/*.scss')
        .pipe($.plumber()) //出錯不中斷，指令加在src後即可
        .pipe($.sourcemaps.init())
        //.pipe($.sass().on('error', $.sass.logError))  //單純編譯sass
        .pipe($.sass({
            'includePaths': ['./bower_components/bootstrap-sass/assets/stylesheets',
                './bower_components/components-font-awesome/scss'
            ]
        }).on('error', $.sass.logError)) //有include Bootstrap-Sass、fontawesome
        //此時已編譯好 CSS
        .pipe($.postcss(plugins)) //自動為你的 CSS 補上前綴詞
        .pipe($.if(Options.env === "build", $.cleanCss())) //壓縮css
        .pipe($.sourcemaps.write('.')) //紀錄屬性來自哪個CSS檔
        .pipe(gulp.dest('./public/css'))
        .pipe(browserSync.stream());
});

/* fontawesome字體 和 其他字體 */
gulp.task('icons', function () {
    return gulp.src(['./bower_components/components-font-awesome/fonts/**.*', './source/fonts/*'])
        .pipe(gulp.dest('./public/fonts'));
});

/* JavaScript ES6 編譯工具 */
gulp.task('babel', () =>
    gulp.src('./source/js/**/*.js')
    .pipe($.sourcemaps.init())
    .pipe($.babel({
        presets: ['es2015']
    })) //編譯es5
    //.pipe($.concat('all.js')) //將自己寫的所有js合併成一個檔案
    .pipe($.if(Options.env === "build", $.uglify({
        compress: {
            drop_console: true //將console.log移除
        }
    }))) //壓縮js
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('./public/js'))
    .pipe(browserSync.stream())
);

/* 圖片壓縮 */
gulp.task('image-min', () =>
    gulp.src('./source/img/*')
    .pipe($.if(Options.env === "build", $.imagemin())) //壓縮圖檔
    .pipe(gulp.dest('./public/img'))
);

/* 載入相關的外部檔案，參考 bower.json */
gulp.task('bower', function () {
    return gulp.src(mainBowerFiles())
        .pipe(gulp.dest('./.tmp/vendors')) //暫放在此資料夾
});

/* 將外部檔案與專案連結 */
/* 中間的中括號['bower']，代表要先執行 bower 任務，然後才執行 vendorJS 的任務 */
gulp.task('vendorJs', ['bower'], function () {
    // return gulp.src(['./.tmp/vendors/jquery.js','./.tmp/vendors/bootstrap.js'])
    return gulp.src('./.tmp/vendors/**/**.js')
        .pipe($.order(['jquery.js', '*.js']))
        .pipe($.concat('vendors.js')) //將外部檔案所有js合併成一個檔案
        .pipe($.if(Options.env === "build", $.uglify({
            compress: {
                drop_console: true //將console.log移除
            }
        }))) //壓縮js
        .pipe(gulp.dest('./public/js'))
})


/* Web Server - 包含 Livereload */
gulp.task('browser-sync', function () {
    browserSync.init({
        server: {
            baseDir: "./public"
        },
        reloadDebounce: 2000
    });
});



/* 監控任務 */
gulp.task('watch', function () {
    //參數1：監控的資料夾；參數2：執行的任務
    //當監控資料夾有變更時，會立即執行任務
    gulp.watch('./source/**/*.html', ['copyHTML']);
    gulp.watch('./source/scss/**/*.scss', ['sass']);
    gulp.watch('./source/*.jade', ['jade']);
    gulp.watch('./source/js/**/*.js', ['babel']);
});


gulp.task('deploy', function () {
    return gulp.src('./public/**/*')
        .pipe($.ghPages());
});


/* 發佈專案時，使用的 任務 */
gulp.task('build', gulpSequence('clean', 'minify-html', 'jade', 'sass', 'icons', 'babel', 'vendorJs', 'image-min'))

/* 將多個任務一起執行，任務default為gulp的預設名稱，所以執行時，只需打 gulp 即可。 */
gulp.task('default', ['copyHTML', 'jade', 'sass', 'icons', 'babel', 'vendorJs', 'image-min', 'browser-sync', 'watch'])


/* 總結 */
//開發環境輸入指令：gulp
//發佈專案輸入指令：gulp build --env build