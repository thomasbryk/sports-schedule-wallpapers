let WallpaperData = {
    logos: {
        main: {
            width: 550,
            height: 500,
            position: {
                y: 953
            }
        },
        game: {
            width: 65,
            height: 52,
            offset: {
                x: 69.5,
                y: 66.5
            }
        },
        solo: {
            width: 600,
            height: 550
        }
    },
    dateBlock: {
        opacity: {
            default: 0.04,
            home: 0.2,
            away: 0.03
        },
        width: 138,
        height: 138,
        offset: {
            x: 12,
            y: 14
        },
        position: {
            x: 65.75,
            y: 1469
        },

        date: {
            fontSize: 36.82,
            offset: {
                x: 8,
                y: 4
            }
        },

        time: {
            fontSize: {
                time: 29.46
            },
            offset: {
                x: 44,
                y: 95
            }
        }
    },
    month: {
        block: {
            position: {
                x: 458,
                y: 1356
            },
            size: {
                width: 254,
                height: 49
            },
            fontSize: 44.85,
            filename: 'month-name.png'
        },
        text: {
            opacity: 0.25,
            fontSize: 27.78,
            position: {
                y: 1421
            }
        },
        home_away: {
            size: {
                width: 66,
                height: 66
            },
            fontSize: 22.2
        },
        weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    }
}


const sketch = (p) => {
    let jerseyFont;

    let center, middle;

    let scaleRatio = 1;
    let exportRatio;
    let graphics;
    let canvas;

    let drawVars = {
        schedule: null,
        selectedTeam: null,
        saveWallpaper: false,
        wallpaperFileName: null,
        logo: false,
        games: false,
        datesToDraw: 0,
        datesDrawn: 0,
        calendar: false
    }


    p.center = (objectWidth) => center - (objectWidth / 2);
    p.middle = (objectHeight) => middle - (objectHeight / 2);

    p.getScaled = (pixels) => (pixels / exportRatio);
    p.getScaledPosition = (position, objectSize) => (position / exportRatio) - (objectSize / 2);

    // returns week of the month starting with 0
    p.getWeekOfMonth = (year, month, day) => {
        var firstWeekday = new Date(year, month, 1).getDay();
        var offsetDate = day + firstWeekday - 1;
        return Math.floor(offsetDate / 7) + 1;
    }

    p.daysInMonth = (month, year) => {
        return new Date(year, month + 1, 0).getDate();
    }

    p.scaleImage = (img, widthLimit, heightLimit) => {
        let imgW = img.width;
        let imgH = img.height;

        let hScaleFactor = imgH / heightLimit;
        let wScaleFactor = imgW / widthLimit;

        scaleFactor = (imgW / hScaleFactor > widthLimit ? wScaleFactor : hScaleFactor);

        let imgSize = {
            width: (imgW / scaleFactor) / exportRatio,
            height: (imgH / scaleFactor) / exportRatio
        }

        return imgSize;
    }


    p.preload = () => {
        jerseyFont = p.loadFont('assets/webfonts/Jersey-M54-Custom.ttf');
    }

    p.setup = () => {
        const $element = $('#sketch-holder');

        const w = $element.width();
        const h = $element.height();

        exportRatio = (w == 390 ? 3 : 6);

        graphics = p.createGraphics(w, h);
        canvas = p.createCanvas(w, h);
        canvas.parent('sketch-holder');

        center = p.width / 2;
        middle = p.height / 2;
    }

    p.exportHighResolution = (fileName, selectedTeamId, schedule = null) => {
        if (!canvas) return;
        alert(canvas.elt.toDataURL());
        drawVars.wallpaperFileName = fileName;
        drawVars.schedule = schedule;

        const $element = $('#sketch-holder');

        const w = $element.width();
        const h = $element.height();

        scaleRatio = exportRatio;
        drawVars.saveWallpaper = true;

        // Re-create graphics with exportRatio and re-draw
        graphics = p.createGraphics(scaleRatio * w, scaleRatio * h);
        canvas = p.createCanvas(scaleRatio * w, scaleRatio * h);
        canvas.parent('sketch-holder');
        //$(canvas.elt).hide();

        p.draw(selectedTeamId, schedule);
    }


    p.draw = (selectedTeamId, schedule = null) => {
        p.noLoop();

        if (!selectedTeamId) return;

        drawVars.selectedTeamId = selectedTeamId;
        drawVars.schedule = schedule;

        graphics.clear(); // Clear graphics each frame
        canvas.clear()

        let colour = $('#Colour').val();

        graphics.background(colour);
        graphics.scale(scaleRatio); // Transform (scale) all the drawings

        drawVars.datesDrawn = 0;
        drawVars.logo = false;

        p.draw_Logo(selectedTeamId);
        p.draw_Calendar(schedule);
    }

    p.draw_Logo = (selectedTeamId) => {
        let logoFileName = $('#Logo').val();
        let filePath = window.location.href + 'leagues/nhl/logos/' + selectedTeamId + '/' + logoFileName;

        p.loadImage(filePath, (img) => {
            let imgSize = p.scaleImage(img, WallpaperData.logos.main.width, WallpaperData.logos.main.height);

            let imgX = p.center(imgSize.width);
            let imgY = p.getScaledPosition(WallpaperData.logos.main.position.y, imgSize.height)

            graphics.image(img, imgX, imgY, imgSize.width, imgSize.height);

            drawVars.logo = true;
            p.drawGraphics();
        });
    }

    p.draw_Calendar = (schedule = null) => {
        graphics.noStroke();

        let date = new Date();
        drawVars.datesToDraw = p.daysInMonth(date.getMonth(), date.getFullYear());

        let dayOfWeek = {
            offsetX: 0,
            posX: 0,
            posY: p.getScaled(WallpaperData.month.text.position.y)
        }

        graphics.textAlign(p.CENTER, p.CENTER);

        //Loop through days of the week
        for (let i = 1; i < WallpaperData.month.weekdays.length + 1; i++) {
            dayOfWeek.offsetX = (i == 1) ? 0 : (WallpaperData.dateBlock.width + WallpaperData.dateBlock.offset.x) * (i - 1)
            dayOfWeek.posX = p.getScaled(WallpaperData.dateBlock.position.x + dayOfWeek.offsetX + (WallpaperData.dateBlock.width / 2));

            graphics.fill('rgba(255, 255, 255, ' + WallpaperData.month.text.opacity + ')');
            graphics.textFont(jerseyFont, p.getScaled(WallpaperData.month.text.fontSize));
            graphics.text(WallpaperData.month.weekdays[i - 1], dayOfWeek.posX, dayOfWeek.posY);
        }

        p.draw_HomeAway();

        let drawDatePromises = [];

        let monthFilePath = window.location.href + 'assets/images/' + WallpaperData.month.block.filename;

        p.loadImage(monthFilePath, (img) => {
            let imgSize = p.scaleImage(img, WallpaperData.month.block.size.width, WallpaperData.month.block.size.height);

            let imgX = p.center(imgSize.width);
            let imgY = p.getScaledPosition(WallpaperData.month.block.position.y, imgSize.height)

            graphics.image(img, imgX, imgY, imgSize.width, imgSize.height);

            let colour = $('#Colour').val();
            let month = date.toLocaleDateString('default', { month: 'long' });

            graphics.textAlign(p.CENTER, p.CENTER);
            graphics.fill(colour);
            graphics.textFont(jerseyFont, p.getScaled(WallpaperData.month.block.fontSize));
            graphics.text(month.toUpperCase(), center, imgY + p.getScaled(WallpaperData.month.block.size.height / 2) - 1.25);


            let currDate, currGame = null;

            for (let i = 1; i <= drawVars.datesToDraw; i++) {
                currDate = new Date(date.getFullYear(), date.getMonth(), i);
                currGame = (schedule ? schedule.find(g => g.date.day == currDate.getDate()) : null);

                drawDatePromises.push(p.draw_Date(currDate, currGame));
            }

            Promise.all(drawDatePromises).then(() => {
                drawVars.calendar = true;
                p.drawGraphics();
            })
        });
    }

    p.draw_Date = async(date, game = null) => {
        let dayNum = date.getDate();
        let dayOfWeek = date.getDay() + 1;
        let weekOfMonth = p.getWeekOfMonth(date.getFullYear(), date.getMonth(), dayNum);

        let block_offsetX = (dayOfWeek == 1) ? 0 : (WallpaperData.dateBlock.width + WallpaperData.dateBlock.offset.x) * (dayOfWeek - 1)
        let block_offsetY = (weekOfMonth == 1) ? 0 : (WallpaperData.dateBlock.height + WallpaperData.dateBlock.offset.y) * (weekOfMonth - 1)
        let blockX_prescaled = WallpaperData.dateBlock.position.x + block_offsetX;
        let blockY_prescaled = WallpaperData.dateBlock.position.y + block_offsetY;

        let block = {
            x: p.getScaled(WallpaperData.dateBlock.position.x + block_offsetX),
            y: p.getScaled(WallpaperData.dateBlock.position.y + block_offsetY),
            width: p.getScaled(WallpaperData.dateBlock.width),
            height: p.getScaled(WallpaperData.dateBlock.height)
        }

        let dayX = p.getScaled(blockX_prescaled + WallpaperData.dateBlock.date.offset.x);
        let dayY = p.getScaled(blockY_prescaled + WallpaperData.dateBlock.date.offset.y);

        graphics.textAlign(p.LEFT, p.TOP);
        graphics.fill('white');
        graphics.textFont(jerseyFont, p.getScaled(WallpaperData.dateBlock.time.fontSize));
        graphics.text(dayNum, dayX, dayY);

        let opacity = (game ? (game.home ? WallpaperData.dateBlock.opacity.home : WallpaperData.dateBlock.opacity.away) : WallpaperData.dateBlock.opacity.default);
        graphics.fill('rgba(255, 255, 255, ' + opacity + ')');
        graphics.rect(block.x, block.y, block.width, block.height);

        if (game) {
            let blockCenter = blockX_prescaled + WallpaperData.dateBlock.width / 2;
            let timeX = p.getScaled(blockX_prescaled + WallpaperData.dateBlock.width / 2);
            let timeY = p.getScaled(blockY_prescaled + WallpaperData.dateBlock.time.offset.y);

            graphics.textAlign(p.CENTER, p.TOP);
            graphics.fill('white');
            graphics.textFont(jerseyFont, p.getScaled(WallpaperData.dateBlock.date.fontSize));
            graphics.text(game.date.dateText, timeX, timeY);

            let filePath = window.location.href + 'leagues/nhl/logos/' + game.opponent.id + '/Primary.png';

            return new Promise((resolve) => {
                p.loadImage(filePath, (img) => {
                    let imgSize = p.scaleImage(img, WallpaperData.logos.game.width, WallpaperData.logos.game.height);

                    let imgX = p.getScaledPosition(blockCenter, imgSize.width);
                    let imgY = p.getScaledPosition(blockY_prescaled + WallpaperData.logos.game.offset.y, imgSize.height)

                    graphics.image(img, imgX, imgY, imgSize.width, imgSize.height);
                    drawVars.datesDrawn++;

                    resolve();
                })
            });
        } else {
            drawVars.datesDrawn++;
        }
    }

    p.draw_HomeAway = () => {
        let date = new Date();
        let dayOfWeek_firstDay = (new Date(date.getFullYear, date.getMonth, 1)).getDay();

        let offsetX = 0;
        let offsetY = 0;

        if (dayOfWeek_firstDay == 0) {
            let weekOfMonth = p.getWeekOfMonth(date.getFullYear(), date.getMonth(), drawVars.datesToDraw);

            offsetX = (WallpaperData.dateBlock.width + WallpaperData.dateBlock.offset.x) * (6)
            offsetY = (weekOfMonth == 1) ? 0 : (WallpaperData.dateBlock.height + WallpaperData.dateBlock.offset.y) * (weekOfMonth - 1)
        }

        let x_home = p.getScaled(WallpaperData.dateBlock.position.x + offsetX);
        let x_away = p.getScaled(WallpaperData.dateBlock.position.x + offsetX + (WallpaperData.dateBlock.width - WallpaperData.month.home_away.size.width));
        let y = p.getScaled(WallpaperData.dateBlock.position.y + offsetY);

        graphics.fill('rgba(255, 255, 255, ' + WallpaperData.dateBlock.opacity.home + ')');
        graphics.rect(x_home, y, p.getScaled(WallpaperData.month.home_away.size.width), p.getScaled(WallpaperData.month.home_away.size.height));

        graphics.fill('rgba(255, 255, 255, ' + WallpaperData.dateBlock.opacity.away + ')');
        graphics.rect(x_away, y, p.getScaled(WallpaperData.month.home_away.size.width), p.getScaled(WallpaperData.month.home_away.size.height));

        let x_homeText = x_home + p.getScaled(WallpaperData.month.home_away.size.width / 2);
        let x_awayText = x_away + p.getScaled((WallpaperData.month.home_away.size.width / 2) - 4);
        let y_text = y + p.getScaled(WallpaperData.month.home_away.size.height / 2);

        graphics.textAlign(p.CENTER, p.CENTER);
        graphics.fill('white');
        graphics.textFont(jerseyFont, p.getScaled(WallpaperData.month.home_away.fontSize));
        graphics.text("HOME", x_homeText, y_text);
        graphics.text("AWAY", x_awayText, y_text);
    }

    p.drawGraphics = () => {
        if (!drawVars.logo || !drawVars.calendar) return;

        p.image(graphics, 0, 0); // Draw graphics to canvas

        drawVars.logo = false;
        drawVars.calendar = false;
        drawVars.datesDrawn = 0;

        if (drawVars.saveWallpaper) {
            //canvas.elt.toBlobHD(p.saveWallpaper);
            p.saveWallpaper();
        }
    }


    p.saveWallpaper = (blob = null) => {
        p.image(canvas, 0, 0); // Draw graphics to canvas
        var image = canvas.elt.toDataURL("image/png")

        let a = document.createElement('a');
        a.target = '_blank';
        a.href = image;
        a.click();
        //alert(blob);
        //saveAs(blob, drawVars.wallpaperFileName + '.png');
        drawVars.saveWallpaper = false;
        const $element = $('#sketch-holder');

        const w = $element.width();
        const h = $element.height();

        // Reset scaleRation back to 1, re-create graphics, re-draw
        scaleRatio = 1;
        graphics = p.createGraphics(w, h);
        canvas = p.createCanvas(w, h);
        canvas.parent('sketch-holder');
        $(canvas.elt).show();

        p.draw(drawVars.selectedTeamId, drawVars.schedule);
    }
}

let p = new p5(sketch);