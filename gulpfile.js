var gulp = require('gulp'),
    browserify = require('browserify'),
    source = require('vinyl-source-stream'),
    // uglify = require('gulp-uglify'),
    streamify = require('gulp-streamify'),
    watchify = require('watchify'),
    browserSync = require('browser-sync');

gulp.task('serve', function () {
    // .init starts the server
    const bs = browserSync.create();
    bs.init({
        server: "./",
        port: 3010
    });
});

gulp.task('compile_dev', function () {
    // place code for your default task here
    var b = browserify({
        entries: ['./src/main.js'],
        plugin: [watchify]
    }).transform('browserify-css', { global: true });

    function bundle() {
        return b.bundle()
            .pipe(source('bundle.js'))
            .pipe(gulp.dest('./build/'));
    }

    b.on('update', bundle);

    return bundle();
});

gulp.task('default', gulp.series('compile_dev', 'serve'));