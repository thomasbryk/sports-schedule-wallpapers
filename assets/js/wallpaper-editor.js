var leagues = null;

var selectedTeam, selectedLeague, schedule;
var dropdownsPopulated = false;
var leagueSlider_mouseDownX = null;
var teamSlider_mouseDownX = null;

// ─── Resolution state ────────────────────────────────────────────────────────

const RESOLUTIONS = {
    portrait: {
        presets: [
            { label: 'Standard',  w: 1080, h: 1920 },
            { label: 'Tall',      w: 1080, h: 2340 },
            { label: 'XL',        w: 1290, h: 2796 }
        ],
        devices: [
            // Shown in the "Device presets" dropdown only
            { label: 'iPhone SE (3rd gen)',      w: 750,  h: 1334 },
            { label: 'iPhone 12 / 13 mini',      w: 1080, h: 2340 },
            { label: 'iPhone 14 / 15',           w: 1179, h: 2556 },
            { label: 'iPhone 15 Pro Max',        w: 1290, h: 2796 },
            { label: 'Samsung Galaxy S24',       w: 1080, h: 2340 },
            { label: 'Samsung Galaxy S24 Ultra', w: 1440, h: 3088 },
            { label: 'Google Pixel 9',           w: 1080, h: 2424 },
            { label: 'OnePlus 12',               w: 1440, h: 3168 }
        ],
        default: { w: 1080, h: 1920 }
    },
    landscape: {
        presets: [
            { label: '1080p', w: 1920,  h: 1080 },
            { label: '1440p', w: 2560,  h: 1440 },
            { label: '4K',    w: 3840,  h: 2160 }
        ],
        default: { w: 1920, h: 1080 }
    }
};

let currentOrientation = 'portrait';
let currentW = RESOLUTIONS.portrait.default.w;
let currentH = RESOLUTIONS.portrait.default.h;

// ─── Boot ────────────────────────────────────────────────────────────────────

$(document).ready(function () {
    $('#wallpaper').hide();
    $('#scheduleError').hide();
    $('#scheduleRetry').hide();
    $('#TimeZone').val('');

    buildResolutionUI();
    onload();
});

function onload() {
    fetch('leagues/leagues.json')
        .then(r => r.json())
        .then(json => leagues = json.leagues[0])
        .then(() => {
            const promises = [];
            $.each(leagues, (i) => promises.push(RetrieveLeague(leagues[i])));
            Promise.all(promises).then(() => {
                PopulateCarousels();
                PopulateTimeZones();
            });
        });
}

async function RetrieveLeague(league) {
    return new Promise((resolve) => {
        fetch(league.path + league.jsonPath)
            .then(r => r.json())
            .then(json => league['teams'] = json.teams)
            .then(resolve);
    });
}

// ─── Resolution UI ───────────────────────────────────────────────────────────

function buildResolutionUI() {
    const $container = $('#resolution-selector');
    if (!$container.length) return;

    // Orientation toggle
    const $toggle = $(`
        <div class="orientation-toggle" id="orientation-toggle">
            <button class="orient-btn active" data-orient="portrait" title="Portrait">
                <svg viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="22" height="38" rx="3" stroke="currentColor" stroke-width="2"/>
                    <circle cx="12" cy="35" r="1.5" fill="currentColor"/>
                </svg>
                <span>Portrait</span>
            </button>
            <button class="orient-btn" data-orient="landscape" title="Landscape">
                <svg viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="38" height="22" rx="3" stroke="currentColor" stroke-width="2"/>
                    <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
                </svg>
                <span>Landscape</span>
            </button>
        </div>
    `);

    // Preset buttons row
    const $presets = $('<div class="res-presets" id="res-presets"></div>');

    // Custom dimension inputs
    const $custom = $(`
        <div class="res-custom">
            <input type="number" id="res-w" min="100" max="7680" placeholder="W" />
            <span class="res-sep">×</span>
            <input type="number" id="res-h" min="100" max="7680" placeholder="H" />
            <button class="res-apply-btn" id="res-apply">Apply</button>
        </div>
    `);

    // Device presets dropdown (portrait only)
    const $deviceWrap = $(`
        <div class="res-device-wrap" id="res-device-wrap">
            <select id="res-device-select">
                <option value="">Device presets…</option>
            </select>
        </div>
    `);

    RESOLUTIONS.portrait.devices.forEach(d => {
        $('#res-device-select', $deviceWrap).append(
            $('<option>').val(`${d.w}x${d.h}`).text(`${d.label} (${d.w}×${d.h})`)
        );
    });

    $container.append($toggle, $presets, $custom, $deviceWrap);

    // Populate preset buttons for current orientation
    renderPresetButtons();

    // Set default dimensions in inputs
    $('#res-w').val(currentW);
    $('#res-h').val(currentH);

    // ── Event handlers ────────────────────────────────────────────────────────

    // Orientation toggle
    $container.on('click', '.orient-btn', function () {
        const orient = $(this).data('orient');
        if (orient === currentOrientation) return;

        currentOrientation = orient;
        $('.orient-btn').removeClass('active');
        $(this).addClass('active');

        // Reset to default dimensions for this orientation
        const def = RESOLUTIONS[orient].default;
        currentW = def.w;
        currentH = def.h;
        $('#res-w').val(currentW);
        $('#res-h').val(currentH);

        renderPresetButtons();
        applyResolution();

        // Show/hide device dropdown
        $('#res-device-wrap').toggle(orient === 'portrait');

        // Resize the preview box to match the new aspect ratio
        updatePreviewBox();
    });

    // Preset button click
    $container.on('click', '.res-preset-btn', function () {
        currentW = parseInt($(this).data('w'));
        currentH = parseInt($(this).data('h'));
        $('#res-w').val(currentW);
        $('#res-h').val(currentH);
        $('.res-preset-btn').removeClass('active');
        $(this).addClass('active');
        applyResolution();
        updatePreviewBox();
    });

    // Device dropdown
    $container.on('change', '#res-device-select', function () {
        const val = $(this).val();
        if (!val) return;
        const [w, h] = val.split('x').map(Number);
        currentW = w;
        currentH = h;
        $('#res-w').val(w);
        $('#res-h').val(h);
        $('.res-preset-btn').removeClass('active');
        applyResolution();
        updatePreviewBox();
    });

    // Custom apply
    $container.on('click', '#res-apply', function () {
        const w = parseInt($('#res-w').val());
        const h = parseInt($('#res-h').val());
        if (!w || !h || w < 100 || h < 100) return;
        currentW = w;
        currentH = h;
        $('.res-preset-btn').removeClass('active');
        $('#res-device-select').val('');
        applyResolution();
        updatePreviewBox();
    });

    // Also apply on Enter key in custom inputs
    $container.on('keydown', '#res-w, #res-h', function (e) {
        if (e.key === 'Enter') $('#res-apply').trigger('click');
    });

    // Trigger initial preview sizing
    updatePreviewBox();
}

function renderPresetButtons() {
    const $presets = $('#res-presets');
    $presets.empty();

    RESOLUTIONS[currentOrientation].presets.forEach(preset => {
        const isActive = (preset.w === currentW && preset.h === currentH);
        const $btn = $(`
            <button class="res-preset-btn${isActive ? ' active' : ''}"
                    data-w="${preset.w}" data-h="${preset.h}">
                ${preset.label}
            </button>
        `);
        $presets.append($btn);
    });
}

/**
 * Tell the p5 sketch about the new resolution and re-draw if a team is selected.
 */
function applyResolution() {
    if (typeof p !== 'undefined' && p.setResolution) {
        p.setResolution(currentW, currentH, currentOrientation);
    }
    CreateWallpaper();
}

/**
 * Resize the #sketch-holder preview box to preserve the correct aspect ratio while fitting within the viewer panel.
 */
function updatePreviewBox() {
    const $viewer = $('#wallpaper-viewer');
    const $holder = $('#sketch-holder');

    const maxW = $viewer.width()  || 390;
    const maxH = $viewer.height() || 844;

    const ratio = currentW / currentH;
    let previewW, previewH;

    if (ratio >= 1) {
        // Landscape: fit to width
        previewW = Math.min(maxW, maxH * ratio);
        previewH = previewW / ratio;
    } else {
        // Portrait: fit to height
        previewH = Math.min(maxH, maxW / ratio);
        previewW = previewH * ratio;
    }

    $holder.css({ width: previewW + 'px', height: previewH + 'px' });

    if (typeof p !== 'undefined' && p.resizePreview) {
        p.resizePreview();
    }
}

// ─── League / team carousels ─────────────────────────────────────────────────

function PopulateCarousels() {
    const $leaguesDiv = $('#leaguesCarousel');
    const $mainDiv    = $('#main');

    $.each(leagues, (i) => {
        const currLeague = leagues[i];

        const leagueHtml = `
            <a name="${currLeague.id}" class="league block link">
                <article class="block leagueBlock"
                    style="background-image: url('${currLeague.path}emblem.png');">
                </article>
            </a>`;
        $leaguesDiv.append(leagueHtml);

        const $newTeamDiv = $(`<div id="${currLeague.id}" class="teamsCarousel inner"></div>`);
        $mainDiv.append($newTeamDiv);

        const teams = [...currLeague.teams].sort((a, b) => a.name.localeCompare(b.name));

        teams.filter(t => t.active).forEach(teamData => {
            const firstLogo   = Object.values(teamData.logos)[0];
            const firstColour = Object.values(teamData.colours)[0];
            const teamHtml = `
                <a name="${teamData.id}" league="${currLeague.id}" class="team block link">
                    <article class="block"
                        style="background-image: url('${currLeague.path}logos/${teamData.id}/${firstLogo}');
                               background-color: ${firstColour};">
                    </article>
                </a>`;
            $newTeamDiv.append(teamHtml);
        });

        $newTeamDiv.hide();
    });

    const $teamsCarousel = $('.teamsCarousel');

    $leaguesDiv.slick({
        slidesToShow: 4,
        responsive: [{ breakpoint: 850, settings: { slidesToShow: 2 } }]
    });

    $teamsCarousel.slick({
        slidesToShow: 16,
        slidesToScroll: 16,
        autoplaySpeed: 3500,
        swipe: true,
        touchMove: true,
        responsive: [
            { breakpoint: 1100, settings: { slidesToShow: 8,  slidesToScroll: 8  } },
            { breakpoint: 850,  settings: { slidesToShow: 6,  slidesToScroll: 6  } },
            { breakpoint: 550,  settings: { mobileFirst: true, slidesToShow: 4, slidesToScroll: 4 } }
        ]
    });

    // League click
    $('.league').each((i, league) => {
        $(league).mousedown(e => { leagueSlider_mouseDownX = e.pageX; });
        $(league).mouseup(e => {
            if (leagueSlider_mouseDownX >= e.pageX - 3 &&
                leagueSlider_mouseDownX <= e.pageX + 3) {
                const leagueId = $(e.target).parent().attr('name');
                $(e.target).parent().addClass('selected');
                LeagueSelected(leagueId);
            }
        });
    });

    // Team click
    $('.team').each((i, team) => {
        $(team).mousedown(e => { teamSlider_mouseDownX = e.pageX; });
        $(team).mouseup(e => {
            if (teamSlider_mouseDownX >= e.pageX - 3 &&
                teamSlider_mouseDownX <= e.pageX + 3) {
                const teamId   = $(e.target).parent().attr('name');
                const leagueId = $(e.target).parent().attr('league');
                TeamSelected(teamId, leagueId);
            }
        });
    });
}

// ─── Dropdowns ───────────────────────────────────────────────────────────────

function PopulateTimeZones() {
    const $timeZone = $('#TimeZone');
    Intl.supportedValuesOf('timeZone').forEach(tz => {
        $timeZone.append(new Option(tz.replaceAll('_', ' '), tz));
    });

    if ($('#TimeZone').prop('disabled')) {
        $timeZone.val('');
    } else {
        $timeZone.val(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
}

function PopulateLogos() {
    const $logo = $('#Logo');
    $logo.empty();

    $.each(selectedTeam.logos, (key, logo) => {
        const option = new Option(key, logo);
        if (key === 'Primary') $logo.prepend(option);
        else $logo.append(option);
    });

    $logo.prop('selectedIndex', 0);
    PopulateColours();
}

function PopulateColours() {
    const $colour = $('#Colour');
    $colour.empty();

    $.each(selectedTeam.colours, (name, hex) => {
        $colour.append(new Option(name, hex));
    });
    $colour.append(new Option('Black', '#000000'));

    dropdownsPopulated = true;
}

// ─── League / team selection ──────────────────────────────────────────────────

function LeagueSelected(leagueId) {
    const $visibleLeagues = $('.teamsCarousel:visible');

    if ($visibleLeagues.length > 0) {
        const $currLeague   = $($visibleLeagues[0]);
        const currLeagueId  = $currLeague[0].id;
        const $currLeagueBtn = $(`a.league[name=${currLeagueId}]`);

        $('button.slick-arrow:visible').fadeOut('fast');
        $currLeagueBtn.removeClass('selected');
        $currLeague.slick('slickPause');
        $currLeague.slideUp();

        if (currLeagueId === leagueId) return;
    }

    const $selectedLeague = $(`.teamsCarousel#${leagueId}`);
    if ($selectedLeague.length > 0) {
        const $leagueButtons = $selectedLeague.children('button.slick-arrow');
        $leagueButtons.hide();
        $($selectedLeague[0]).slick('slickGoTo', 0);
        $($selectedLeague[0]).slideDown(() => {
            $leagueButtons.fadeIn();
            $($selectedLeague[0]).slick('slickPlay');
        });
    }

    selectedLeague = findLeagueById(leagueId);
}

function TeamSelected(teamId) {
    // Fix: compare as strings since DOM attrs are always strings
    if (selectedTeam && String(selectedTeam.id) === String(teamId)) return;

    $('#wallpaper-viewer').addClass('spinner');

    $('a.team.selected').each((i, team) => {
        const $team = $(team);
        if (!($team.attr('league') === String(selectedLeague.id) &&
              $team.attr('name')   === String(teamId))) {
            $team.removeClass('selected');
        }
    });

    $(`a.team[league=${selectedLeague.id}][name=${teamId}]`).addClass('selected');
    $(`a.team[league=${selectedLeague.id}][name=${teamId}]`)
        .parent().parent().parent().slick('slickPause');

    selectedTeam = selectedLeague.teams.find(t => String(t.id) === String(teamId));
    schedule = null;
    dropdownsPopulated = false;

    $('#selectTeamError').fadeOut();

    const $wallpaperEditor = $('#wallpaper-editor');
    $('html,body').animate({ scrollTop: $wallpaperEditor.offset().top }, 'slow')
        .promise().done(() => {
            PopulateLogos();
            RetrieveSchedule(true);
        });
}

// ─── Schedule retrieval ───────────────────────────────────────────────────────

function RetrieveSchedule(firstSelection = null) {
    const currDate = new Date();
    const yyyy = currDate.getFullYear();
    const mm   = currDate.getMonth();

    const firstDay = new Date(yyyy, mm, 1).toISOString().substring(0, 10);
    const lastDay  = new Date(yyyy, mm + 1, 0).toISOString().split('T')[0];

    const includeSchedule = $('#Schedule').prop('checked');

    if (includeSchedule || firstSelection) {
        switch (selectedLeague.id) {
            case 1: RetrieveSchedule_MLB(firstDay, lastDay); break;
            case 2: RetrieveSchedule_NHL(firstDay, lastDay); break;
        }
    } else if (!firstSelection && schedule == null) {
        enableScheduleControls(false);
    } else {
        CreateWallpaper();
    }
}

function RetrieveSchedule_MLB(firstDay, lastDay) {
    $.ajax({
        url: `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${firstDay}&endDate=${lastDay}`,
        accepts: { text: 'application/json' },
        success: function (games) {
            if (!games) { console.log('[RetrieveSchedule_MLB]: null'); return; }

            let scheduleArr = [];
            $.each(games.dates, (i, date) => {
                date.games
                    .filter(g => g.teams.away.team.id == selectedTeam.id ||
                                 g.teams.home.team.id == selectedTeam.id)
                    .forEach(g => scheduleArr.push(g));
            });

            BuildSchedule(scheduleArr.length ? scheduleArr : null);
        }
    });
}

function RetrieveSchedule_NHL(firstDay, lastDay) {
    const month_querystring = firstDay.substring(0, 7);
    $.ajax({
        type: 'GET',
        url: 'https://api.allorigins.win/get?url=' +
             encodeURIComponent(`https://api-web.nhle.com/v1/club-schedule/${selectedTeam.abbreviation}/month/${month_querystring}`),
        cache: false,
        dataType: 'json',
        crossOrigin: true,
        success: function (res) {
            const data  = JSON.parse(res.contents);
            const games = data.games;
            if (!games) { console.log('[RetrieveSchedule_NHL]: null'); return; }

            const scheduleArr = games.filter(g => g.gameType === 2 || g.gameType === 3);
            BuildSchedule(scheduleArr.length ? scheduleArr : null);
        },
        error: function (xhr, status, error) {
            console.log(`[RetrieveSchedule_NHL] failed: ${status} ${error}`);
            BuildSchedule();
        }
    });
}

// ─── Schedule build ───────────────────────────────────────────────────────────

function BuildSchedule(scheduleArr = null) {
    $('#wallpaper-viewer').addClass('spinner');

    const leaguePath  = selectedLeague.path;
    const timeZone_Val = $('#TimeZone').val();

    if (scheduleArr) {
        enableScheduleControls(true);
        schedule = [];

        scheduleArr.forEach(currGame => {
            const obj = {};

            switch (selectedLeague.id) {
                case 1: obj.date = TZIntl.getDateTime(timeZone_Val, currGame.gameDate); break;
                case 2: obj.date = TZIntl.getDateTime(timeZone_Val, currGame.startTimeUTC); break;
            }

            const h = obj.date.hour > 12
                ? obj.date.hour - 12
                : (obj.date.hour === 0 ? 12 : obj.date.hour);
            const m = obj.date.minute < 10
                ? '0' + obj.date.minute
                : obj.date.minute;
            obj.date.dateText = `${h}:${m}`;

            let opponent = {};
            switch (selectedLeague.id) {
                case 1:
                    obj.home = (currGame.teams.home.team.id == selectedTeam.id);
                    opponent = obj.home ? currGame.teams.away.team : currGame.teams.home.team;
                    break;
                case 2:
                    obj.home = (currGame.homeTeam.id == selectedTeam.id);
                    opponent = obj.home ? currGame.awayTeam : currGame.homeTeam;
                    break;
            }

            const opponentObj = selectedLeague.teams.find(t => t.id == opponent.id);
            obj.opponent = {
                id: opponentObj.id,
                abbreviation: opponentObj.abbreviation,
                logo: `../../${leaguePath}logos/${opponentObj.id}/Primary.png`
            };
            schedule.push(obj);
        });

    } else if (schedule) {
        // Re-apply timezone to existing schedule
        schedule.forEach(gameData => {
            gameData.date = TZIntl.getDateTime(timeZone_Val, gameData.date.toISOString());
            const h = gameData.date.hour > 12
                ? gameData.date.hour - 12
                : (gameData.date.hour === 0 ? 12 : gameData.date.hour);
            const m = gameData.date.minute < 10
                ? '0' + gameData.date.minute
                : gameData.date.minute;
            gameData.date.dateText = `${h}:${m}`;
        });
    } else {
        schedule = null;
        enableScheduleControls(false);
    }

    CreateWallpaper();
}

// ─── Wallpaper create / download ─────────────────────────────────────────────

function CreateWallpaper() {
    if (dropdownsPopulated) {
        $('#wallpaper-viewer').addClass('spinner');
        p.draw(selectedLeague, selectedTeam, schedule);
    }
}

function DownloadWallpaper() {
    const imageUrl = $('#wallpaper').attr('src');
    const month    = new Date().toLocaleString('default', { month: 'long' });
    const orient   = currentOrientation === 'landscape' ? '_landscape' : '';
    const filename = `${selectedTeam.abbreviation}_${month}${orient}_${currentW}x${currentH}`;
    saveAs(imageUrl, filename);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const findLeagueById = (id) => {
    const key = Object.keys(leagues).find(k => leagues[k].id == id);
    return leagues[key];
};

function enableScheduleControls(enable) {
    if (enable) {
        $('#scheduleError').fadeOut('fast');
        $('#scheduleRetry').fadeOut('fast');
        $('#TimeZone').css({ opacity: '100%' });
    } else {
        $('#scheduleError').fadeIn('fast');
        $('#scheduleRetry').fadeIn('fast');
        $('#TimeZone').css({ opacity: '35%' });
    }
    $('#Schedule').prop('disabled', !enable).prop('checked', enable);
    $('#TimeZone').prop('disabled', !enable);
}

function scheduleRetryOnClick() {
    $('#wallpaper-viewer').addClass('spinner');
    disableRetry();
    RetrieveSchedule(true);
}

function disableRetry() {
    $('#scheduleRetry').addClass('disabled');
    return new Promise(resolve => {
        setTimeout(() => {
            $('#scheduleRetry').removeClass('disabled');
            resolve();
        }, 4000);
    });
}