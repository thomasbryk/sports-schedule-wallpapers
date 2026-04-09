const sketch = (p) => {
    let jerseyFont;

    let scaleRatio = 1;
    let graphics;
    let canvas;

    // Current render dimensions (internal full-resolution canvas)
    let renderWidth = 1170;
    let renderHeight = 2532;
    let orientation = 'portrait'; // 'portrait' | 'landscape'

    let drawVars = {
        datesToDraw: 0,
        opponentData: {},
        schedule: false,
        selectedLeague: null,
        selectedTeam: null
    };

    let WallpaperData = null;
    let layoutData = null; // shortcut to WallpaperData[orientation]

    fetch("assets/data/wallpaper-data.json")
        .then(response => response.json())
        .then(json => {
            WallpaperData = json.WallpaperData;
            layoutData = WallpaperData[orientation];
        });

    // ─── Coordinate helpers ─────────────────────────────────────────────────────
    // All positions in WallpaperData are stored as fractions (0.0–1.0) of canvas width or height. These helpers convert them to actual pixel values on the current graphics buffer so the layout is resolution-independent.

    // Fraction of canvas width → pixels
    p.pw = (frac) => frac * graphics.width;

    // Fraction of canvas height → pixels
    p.ph = (frac) => frac * graphics.height;

    // Center an object horizontally given its pixel width
    p.centerX = (objWidth) => (graphics.width / 2) - (objWidth / 2);

    // Center an object vertically given its pixel height
    p.centerY = (objHeight) => (graphics.height / 2) - (objHeight / 2);

    // Convert a widthPct/heightPct logo spec into pixel {width, height}
    p.pctToSize = (widthPct, heightPct) => ({
        width: p.pw(widthPct),
        height: p.ph(heightPct)
    });

    /**
     * Scale an image to fit within a box defined by widthPct/heightPct,
     * preserving the image's aspect ratio.
     */
    p.scaleImagePct = (img, widthPct, heightPct) => {
        const limitW = p.pw(widthPct);
        const limitH = p.ph(heightPct);
        const imgW = img.width;
        const imgH = img.height;
        const hScale = imgH / limitH;
        const wScale = imgW / limitW;
        const scaleFactor = (imgW / hScale > limitW) ? wScale : hScale;
        return {
            width: imgW / scaleFactor,
            height: imgH / scaleFactor
        };
    };

    p.daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

    p.getWeekOfMonth = (year, month, day) => {
        const firstWeekday = new Date(year, month, 1).getDay();
        const offsetDate = day + firstWeekday - 1;
        return Math.floor(offsetDate / 7) + 1;
    };

    // ─── Setup ──────────────────────────────────────────────────────────────────

    p.preload = () => {
        jerseyFont = p.loadFont('assets/webfonts/Jersey-M54-Custom.ttf');
    };

    p.setup = () => {
        const $element = $('#sketch-holder');
        const previewW = $element.width();
        const previewH = $element.height();

        p.pixelDensity(2);

        // Create the full-resolution off-screen graphics buffer
        graphics = p.createGraphics(renderWidth, renderHeight);

        // The on-screen canvas is just the preview box size
        canvas = p.createCanvas(previewW, previewH);
        canvas.parent('sketch-holder');

        $(canvas.elt).hide();
        p.noLoop();
    };

    /**
     * Public: update the render resolution and re-draw.
     * Called by wallpaper-editor.js when the user changes preset or enters custom dims.
     */
    p.setResolution = (width, height, newOrientation) => {
        renderWidth = width;
        renderHeight = height;
        orientation = newOrientation;

        if (WallpaperData) {
            layoutData = WallpaperData[orientation];
        }

        // Resize the off-screen buffer; leave the preview canvas untouched
        if (graphics) graphics.remove();
        graphics = p.createGraphics(renderWidth, renderHeight);
    };

    /**
     * Resize the visible preview canvas to match the sketch-holder element.
     * Called after the holder's CSS dimensions change (orientation switch).
     */
    p.resizePreview = () => {
        const $element = $('#sketch-holder');
        p.resizeCanvas($element.width(), $element.height());
    };

    // ─── Main draw entry point ───────────────────────────────────────────────────

    p.draw = (league, team, schedule = null) => {
        if (!league || !team || !WallpaperData) return;

        layoutData = WallpaperData[orientation];

        graphics.clear();
        canvas.clear();

        const isScheduleNull = (schedule == null);
        const sameTeam = (!isScheduleNull && drawVars.schedule) &&
                         (league.id === drawVars.selectedLeague &&
                          team.id === drawVars.selectedTeam);

        drawVars.schedule = !isScheduleNull;
        drawVars.selectedLeague = league.id;
        drawVars.selectedTeam = team.id;

        const leaguePath = league.path;
        const colour = $('#Colour').val();
        graphics.background(colour);

        const drawPromises = [];
        drawPromises.push(p.draw_Logo(team.id, leaguePath));

        const includeSchedule = $('#Schedule').prop('checked');
        if (includeSchedule) {
            drawPromises.push(p.draw_Calendar(schedule, leaguePath, sameTeam));
        }

        Promise.all(drawPromises).then(() => p.drawGraphics());
    };

    // ─── Logo ────────────────────────────────────────────────────────────────────

    p.draw_Logo = async (teamId, leaguePath) => {
        const logoFileName = $('#Logo').val();
        const filePath = `${leaguePath}logos/${teamId}/${logoFileName}`;
        const ld = layoutData;

        return new Promise((resolve) => {
            p.loadImage(filePath, (img) => {
                const imgSize = p.scaleImagePct(
                    img,
                    ld.logos.main.widthPct,
                    ld.logos.main.heightPct
                );

                let imgX, imgY;

                if (orientation === 'portrait') {
                    imgX = p.centerX(imgSize.width);
                    imgY = p.ph(ld.logos.main.position.yPct) - (imgSize.height / 2);
                } else {
                    // Landscape: logo is positioned by xPct + yPct (center point)
                    imgX = p.pw(ld.logos.main.position.xPct) - (imgSize.width / 2);
                    imgY = p.ph(ld.logos.main.position.yPct) - (imgSize.height / 2);
                }

                graphics.image(img, imgX, imgY, imgSize.width, imgSize.height);
                resolve();
            }, () => { console.log("mainLogo failed to load."); });
        });
    };

    // ─── Calendar ────────────────────────────────────────────────────────────────

    p.draw_Calendar = async (schedule, leaguePath, sameTeam) => {
        const ld = layoutData;
        graphics.noStroke();

        const date = new Date();
        drawVars.datesToDraw = p.daysInMonth(date.getMonth(), date.getFullYear());

        // Derived pixel values for the date block grid
        const blockW    = p.pw(ld.dateBlock.widthPct);
        const blockH    = p.ph(ld.dateBlock.heightPct);
        const blockOffX = p.pw(ld.dateBlock.offset.xPct);
        const blockOffY = p.ph(ld.dateBlock.offset.yPct);
        const gridOriginX = p.pw(ld.dateBlock.position.xPct);
        const gridOriginY = p.ph(ld.dateBlock.position.yPct);

        // Draw weekday headers
        graphics.textAlign(p.CENTER, p.CENTER);

        for (let i = 1; i <= ld.month.weekdays.length; i++) {
            const colOffsetX = (i === 1)
                ? 0
                : (blockW + blockOffX) * (i - 1);
            const dayX = gridOriginX + colOffsetX + (blockW / 2);
            const dayY = p.ph(ld.month.text.position.yPct);

            graphics.fill(`rgba(255, 255, 255, ${ld.month.text.opacity})`);
            graphics.textFont(jerseyFont, p.pw(ld.month.text.fontSizePct));
            graphics.text(ld.month.weekdays[i - 1], dayX, dayY);
        }

        const timeZone = schedule ? schedule[0].date.timeZoneName : null;
        p.draw_HomeAway(timeZone);

        const monthFilePath = `assets/images/${ld.month.block.filename}`;

        return new Promise((resolve) => {
            p.loadImage(monthFilePath, (img) => {
                const imgSize = p.scaleImagePct(
                    img,
                    ld.month.block.size.widthPct,
                    ld.month.block.size.heightPct
                );

                const imgX = p.centerX(imgSize.width);
                const imgY = p.ph(ld.month.block.position.yPct) - (imgSize.height / 2);
                graphics.image(img, imgX, imgY, imgSize.width, imgSize.height);

                const colour = $('#Colour').val();
                const month = date.toLocaleDateString('default', { month: 'long' });

                graphics.textAlign(p.CENTER, p.CENTER);
                graphics.fill(colour);
                graphics.textFont(jerseyFont, p.pw(ld.month.block.fontSizePct));
                graphics.text(
                    month.toUpperCase(),
                    graphics.width / 2,
                    imgY + imgSize.height / 2 - 3
                );

                // Load all unique opponent logos before drawing dates
                const opponentPromises = [];
                if (!sameTeam) {
                    drawVars.opponentData = {};
                    const opponentIds = new Set(schedule.map(g => g.opponent.id));
                    opponentIds.forEach((opponentId) => {
                        const filePath = `${leaguePath}logos/${opponentId}/Primary.png`;
                        opponentPromises.push(p.loadTeamImage(filePath, opponentId));
                    });
                }

                Promise.all(opponentPromises).then(() => {
                    const drawDatePromises = [];
                    for (let i = 1; i <= drawVars.datesToDraw; i++) {
                        const currDate = new Date(date.getFullYear(), date.getMonth(), i);
                        const currGames = schedule
                            .filter(g => g.date.day === currDate.getDate())
                            .sort((a, b) => a.date.hour - b.date.hour);
                        drawDatePromises.push(p.draw_Date(currDate, currGames));
                    }
                    Promise.all(drawDatePromises).then(resolve);
                });
            });
        });
    };

    // ─── Individual date block ────────────────────────────────────────────────────

    p.draw_Date = async (date, games = []) => {
        const ld = layoutData;
        const dayNum     = date.getDate();
        const dayOfWeek  = date.getDay() + 1;
        const weekOfMonth = p.getWeekOfMonth(date.getFullYear(), date.getMonth(), dayNum);

        const blockW    = p.pw(ld.dateBlock.widthPct);
        const blockH    = p.ph(ld.dateBlock.heightPct);
        const blockOffX = p.pw(ld.dateBlock.offset.xPct);
        const blockOffY = p.ph(ld.dateBlock.offset.yPct);
        const gridOriginX = p.pw(ld.dateBlock.position.xPct);
        const gridOriginY = p.ph(ld.dateBlock.position.yPct);

        const colOffsetX = (dayOfWeek === 1) ? 0 : (blockW + blockOffX) * (dayOfWeek - 1);
        const rowOffsetY = (weekOfMonth === 1) ? 0 : (blockH + blockOffY) * (weekOfMonth - 1);

        const block = {
            x: gridOriginX + colOffsetX,
            y: gridOriginY + rowOffsetY,
            width: blockW,
            height: blockH
        };

        // Date number
        const dayX = block.x + p.pw(ld.dateBlock.date.offset.xPct);
        const dayY = block.y + p.ph(ld.dateBlock.date.offset.yPct);

        graphics.textAlign(p.LEFT, p.TOP);
        graphics.fill('white');
        graphics.textFont(jerseyFont, p.pw(ld.dateBlock.date.fontSizePct));
        graphics.text(dayNum, dayX, dayY);

        // Block background
        const hasGame = games.length > 0;
        const opacity = hasGame
            ? (games[0].home ? ld.dateBlock.opacity.home : ld.dateBlock.opacity.away)
            : ld.dateBlock.opacity.default;

        graphics.fill(`rgba(255, 255, 255, ${opacity})`);
        graphics.rect(block.x, block.y, block.width, block.height);

        if (!hasGame) return Promise.resolve();

        // Game time text
        const isDouble = games.length === 2;
        const timeText = isDouble
            ? `${games[0].date.dateText}|${games[1].date.dateText}`
            : games[0].date.dateText;

        const timeFontSizePct = isDouble
            ? ld.dateBlock.time.doubleHeader.fontSizePct
            : ld.dateBlock.time.time.fontSizePct;

        const timeOffsetYPct = isDouble
            ? ld.dateBlock.time.doubleHeader.offset.yPct
            : ld.dateBlock.time.time.offset.yPct;

        const timeX = block.x + p.pw(ld.dateBlock.time.offset.xPct);
        const timeY = block.y + p.ph(ld.dateBlock.time.offset.yPct) + p.ph(timeOffsetYPct);

        graphics.textAlign(p.CENTER, p.TOP);
        graphics.fill('white');
        graphics.textFont(jerseyFont, p.pw(timeFontSizePct));
        graphics.text(timeText, timeX, timeY);

        // Opponent logo
        const opponentData = drawVars.opponentData[games[0].opponent.id];
        if (!opponentData) return Promise.resolve();

        const { img, imgSize } = opponentData;
        const logoX = block.x + (block.width / 2) - (imgSize.width / 2);
        const logoY = block.y + p.ph(ld.logos.game.offset.yPct) - (imgSize.height / 2);

        return new Promise((resolve) => {
            graphics.image(img, logoX, logoY, imgSize.width, imgSize.height);
            resolve();
        });
    };

    // ─── Home / Away legend + timezone label ─────────────────────────────────────

    p.draw_HomeAway = (timeZone = null) => {
        const ld = layoutData;
        const date = new Date();
        const dayOfWeek_firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();

        const blockW    = p.pw(ld.dateBlock.widthPct);
        const blockH    = p.ph(ld.dateBlock.heightPct);
        const blockOffX = p.pw(ld.dateBlock.offset.xPct);
        const blockOffY = p.ph(ld.dateBlock.offset.yPct);
        const gridOriginX = p.pw(ld.dateBlock.position.xPct);
        const gridOriginY = p.ph(ld.dateBlock.position.yPct);
        const haW = p.pw(ld.month.home_away.size.widthPct);
        const haH = p.ph(ld.month.home_away.size.heightPct);

        let offsetX = 0;
        let offsetY = 0;
        let offsetY_TimeZone = blockH - haH;

        if (dayOfWeek_firstDay === 0 || dayOfWeek_firstDay === 1) {
            const weekOfMonth = p.getWeekOfMonth(
                date.getFullYear(), date.getMonth(), drawVars.datesToDraw
            );
            offsetX = (blockW + blockOffX) * 6;
            offsetY = (blockH + blockOffY) * (weekOfMonth - 1);
            offsetY_TimeZone = offsetY + haH / 2;
            offsetY += blockH - haH;
        }

        const x_home = gridOriginX + offsetX;
        const x_away = gridOriginX + offsetX + (blockW - haW);
        const y      = gridOriginY + offsetY;

        graphics.fill(`rgba(255, 255, 255, ${ld.dateBlock.opacity.home})`);
        graphics.rect(x_home, y, haW, haH);

        graphics.fill(`rgba(255, 255, 255, ${ld.dateBlock.opacity.away})`);
        graphics.rect(x_away, y, haW, haH);

        const x_homeText = x_home + haW / 2;
        const x_awayText = x_away + haW / 2 - p.pw(0.0034);
        const y_text     = y + haH / 2;

        graphics.textAlign(p.CENTER, p.CENTER);
        graphics.fill('white');
        graphics.textFont(jerseyFont, p.pw(ld.month.home_away.fontSizePct));
        graphics.text('HOME', x_homeText, y_text);
        graphics.text('AWAY', x_awayText, y_text);

        if (timeZone) {
            const tzY = gridOriginY + offsetY_TimeZone;
            const tzH = haH / 2;

            graphics.noFill();
            graphics.strokeWeight(1);
            graphics.stroke(`rgba(255, 255, 255, ${ld.month.text.opacity})`);
            graphics.rect(x_home, tzY, blockW, tzH);
            graphics.noStroke();

            const tzTextX = x_home + blockW / 2;
            const tzTextY = tzY + tzH / 2 - 2;

            graphics.textAlign(p.CENTER, p.CENTER);
            graphics.fill(`rgba(255, 255, 255, ${ld.month.text.opacity})`);
            graphics.textFont(jerseyFont, p.pw(ld.month.home_away.fontSizePct));
            graphics.text(timeZone, tzTextX, tzTextY);
        }
    };

    // ─── Utilities ───────────────────────────────────────────────────────────────

    p.loadTeamImage = async (filePath, teamId) => {
        return new Promise((resolve) => {
            p.loadImage(filePath, (img) => {
                const imgSize = p.scaleImagePct(
                    img,
                    layoutData.logos.game.widthPct,
                    layoutData.logos.game.heightPct
                );
                // Use a plain object assignment instead of defineProperty so the cache can be overwritten when the team changes
                drawVars.opponentData[teamId] = { img, imgSize };
                resolve();
            });
        });
    };

    p.drawGraphics = () => {
        // Draw the full-res buffer scaled to fit the preview canvas
        p.image(graphics, 0, 0, p.width, p.height);

        graphics.elt.toBlob((blob) => {
            const $wallpaper = $('#wallpaper');
            $wallpaper.attr('src', URL.createObjectURL(blob));
            if (!$wallpaper.is(':visible')) $wallpaper.fadeIn();
            setTimeout(() => $('#wallpaper-viewer').removeClass('spinner'), 100);
        }, 'image/jpeg');
    };
};

let p = new p5(sketch);