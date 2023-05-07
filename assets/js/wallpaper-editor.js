var selectedTeam, selectedLeague, schedule;
var leagues = null;
var scheduleRetrieved = false;
var dropdownsPopulated = false;
var teamSlider_mouseDownX = null;


$(document).ready(function() {
    $("#wallpaper").hide();
    onload();
});

function onload() {
    fetch("leagues/leagues.json")
        .then(response => response.json())
        .then(json => leagues = json.leagues[0])
        .then(() => {
            let promises = [];

            $.each(leagues, (i) => {
                promises.push(RetrieveLeague(leagues[i]));
            });

            Promise.all(promises).then(Setup);
        });
}

async function RetrieveLeague(league) {
    return new Promise((resolve) => {
        fetch(league.path + league.jsonPath)
            .then(response => response.json())
            .then(json => league["teams"] = json.teams)
            .then(resolve);
    });
}

function Setup() {
    PopulateTeams();
    PopulateTimeZones();
}

function PopulateTeams() {
    let $leaguesDiv = $("#leaguesCarousel");
    let $mainDiv = $("#main");

    $.each(leagues, (i) => {
        let currLeague = leagues[i];

        let leagueHtml = '<a name="' + currLeague.id + '" class="team link">\
                        <article class="team";\>' + currLeague.name + '</article>\
                    </a>';

        $leaguesDiv.append(leagueHtml);

        let $newTeamDiv = $('<div id="' + currLeague.id + '" class="teamsCarousel inner"></div>');
        $mainDiv.append($newTeamDiv);

        let teams = currLeague.teams;
        teams.sort((a, b) => a.name.localeCompare(b.name))

        $.each(teams, (id, teamData) => {
            let teamHtml = '<a name="' + teamData.id + '" league=' + currLeague.id + ' class="team link">\
                        <article class="team" style=\'background-image: url("' + currLeague.path + 'logos/' + teamData.id + '/Primary.png"); background-color: ' + Object.values(teamData.colours)[0] + ';\'></article>\
                    </a>';

            $newTeamDiv.append(teamHtml);
        });

    });

    $('#leaguesCarousel').slick({
        slidesToShow: 4,
        slidesToScroll: 4,
        autoplay: false,
        autoplaySpeed: 4000,
        swipe: true,
        touchMove: true,
    });

    $('.teamsCarousel').slick({
        slidesToShow: 16,
        slidesToScroll: 16,
        autoplay: true,
        autoplaySpeed: 4000,
        swipe: true,
        touchMove: true,

        responsive: [{
                breakpoint: 1920,
                settings: {
                    slidesToShow: 8,
                    slidesToScroll: 8
                }
            },
            {
                breakpoint: 1140,
                settings: {
                    slidesToShow: 4,
                    slidesToScroll: 4
                }
            }
        ]
    });

    let $teams = $('.team');

    $.each($teams, (i, team) => {
        $(team).mousedown((e) => {
            teamSlider_mouseDownX = e.pageX;
        });

        $(team).mouseup((e) => {
            if (teamSlider_mouseDownX >= e.pageX - 3 && teamSlider_mouseDownX <= e.pageX + 3) {
                let teamId = $(e.target).parent().attr('name');
                let leagueId = $(e.target).parent().attr('league');
                TeamSelected(teamId, leagueId);
            }
        });
    });
}

function PopulateTimeZones() {
    let $timeZone = $("#TimeZone");

    const timeZones = Intl.supportedValuesOf('timeZone')
    timeZones.forEach(tz => {
        let tzName = tz.replaceAll('_', ' ');
        $timeZone.append(new Option(tzName, tz));
    })

    $timeZone.val(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

function PopulateLogos() {
    var $logo = $("#Logo");
    $logo.empty();

    let logos = selectedTeam.logos;
    $.each(logos, (key, logo) => {
        let option = new Option(key, logo);

        if (key == "Primary")
            $logo.prepend(option);
        else
            $logo.append(option);
    })

    $logo.prop("selectedIndex", 0);

    PopulateColours();
}

function PopulateColours() {
    var $colour = $("#Colour");
    $colour.empty();

    $colour.append(new Option("Black", "#000000"));

    jQuery.each(selectedTeam.colours, (name, hex) => {
        $colour.append(new Option(name, hex));
    });

    dropdownsPopulated = true;
}

function PopulateStyles() {
    var $style = $("#Style");

    $style.empty();
    $style.append(new Option());

    for (let style of wallpapersJson.styles) {
        let key = Object.keys(style)[0];
        let label = Object.values(style)[0];
        $style.append(new Option(label, key));
    }
}

function TeamSelected(teamId, leagueId) {
    if (selectedTeam && selectedTeam.id == teamId) return; //Same team, skip

    selectedLeague = findLeagueById(leagueId);

    $("#wallpaper-viewer").addClass("spinner");

    selectedTeam = selectedLeague.teams.find(team => team.id == teamId);

    scheduleRetrieved = false;
    dropdownsPopulated = false;

    var $selectTeamError = $("#selectTeamError");
    $selectTeamError.fadeOut();

    var wallpaperEditor = $("#wallpaper-selector");
    $('html,body').animate({ scrollTop: wallpaperEditor.offset().top }, 'slow').promise().done(() => {
        PopulateLogos();
        RetrieveSchedule();
    });
}

function RetrieveSchedule() {
    switch (selectedLeague.id) {
        case 1:
            RetrieveSchedule_MLB();
        case 2:
            RetrieveSchedule_NHL();
    }

}

function RetrieveSchedule_MLB() {
    schedule = null;

    let currDate = new Date(),
        yyyy = currDate.getFullYear(),
        mm = currDate.getMonth();

    let firstDay = new Date(yyyy, mm, 1).toISOString();
    firstDay = firstDay.substring(0, firstDay.indexOf("T"));

    let lastDay = new Date(yyyy, mm + 1, 0).toISOString();
    lastDay = lastDay.substring(0, lastDay.indexOf("T"));

    $.ajax({
        url: "https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=" + firstDay + "&endDate=" + lastDay,
        accepts: {
            text: "application/json"
        },
        success: function(games) {
            if (!games) {
                console.log("[RetrieveSchedule_MLB]: Retrieved schedule object is null");
                return;
            }
            let scheduleArr = games.dates.filter(date => (date.games.filter(game => (game.teams.away.team.id == selectedTeam.id) || (game.teams.home.team.id == selectedTeam.id))));
            console.log(scheduleArr)
            BuildSchedule_MLB(scheduleArr);
        }
    })
}

function RetrieveSchedule_NHL() {
    schedule = null;

    let currDate = new Date(),
        yyyy = currDate.getFullYear(),
        mm = currDate.getMonth();

    let firstDay = new Date(yyyy, mm, 1).toISOString();
    firstDay = firstDay.substring(0, firstDay.indexOf("T"));

    let lastDay = new Date(yyyy, mm + 1, 0).toISOString();
    lastDay = lastDay.substring(0, lastDay.indexOf("T"));

    $.ajax({
        url: "https://statsapi.web.nhl.com/api/v1/schedule?teamId=" + selectedTeam.id + "&startDate=" + firstDay + "&endDate=" + lastDay,
        accepts: {
            text: "application/json"
        },
        success: function(games) {
            if (!games) {
                console.log("[RetrieveSchedule_NHL]: Retrieved schedule object is null");
                return;
            }
            let scheduleJson = games.dates;

            BuildSchedule_NHL(scheduleJson);
        }
    })
}

function BuildSchedule_MLB(scheduleArr = null) {
    $("#wallpaper-viewer").addClass("spinner");

    let timeZone_Val = $("#TimeZone").val();
    if (scheduleArr) {
        schedule = [];

        scheduleArr.forEach(gameData => {
            let currScheduleObj = {};
            let currGame = gameData.games[0];

            currScheduleObj.date = TZIntl.getDateTime(timeZone_Val, currGame.gameDate);

            let timeHour = (currScheduleObj.date.hour > 12 ? currScheduleObj.date.hour - 12 : (currScheduleObj.date.hour == 0 ? 12 : currScheduleObj.date.hour));
            let timeMin = (currScheduleObj.date.minute < 10 ? "0" + currScheduleObj.date.minute : currScheduleObj.date.minute);
            currScheduleObj.date.dateText = timeHour + ":" + timeMin;

            currScheduleObj.home = (currGame.teams.home.team.id == selectedTeam.id);

            let opponent = (currScheduleObj.home ?
                currGame.teams.away.team :
                currGame.teams.home.team);

            let opponentObj = selectedLeague.teams.find(team => team.id == opponent.id);

            currScheduleObj.opponent = {
                id: opponentObj.id,
                abbreviation: opponentObj.abbreviation,
                logo: "../../leagues/nhl/logos/" + opponentObj.id + "/Primary.png"
            }

            schedule.push(currScheduleObj);
        })
    } else if (schedule) {
        schedule.forEach(gameData => {
            gameData.date = TZIntl.getDateTime(timeZone_Val, gameData.date.toISOString());

            let timeHour = (gameData.date.hour > 12 ? gameData.date.hour - 12 : (gameData.date.hour == 0 ? 12 : gameData.date.hour));
            let timeMin = (gameData.date.minute < 10 ? "0" + gameData.date.minute : gameData.date.minute);
            gameData.date.dateText = timeHour + ":" + timeMin;
        })
    }

    scheduleRetrieved = true;

    CreateWallpaper();
}

function BuildSchedule_NHL(scheduleJson = null) {
    $("#wallpaper-viewer").addClass("spinner");

    let timeZone_Val = $("#TimeZone").val();
    if (scheduleJson) {
        schedule = [];

        scheduleJson.forEach(gameData => {
            let currScheduleObj = {};
            let currGame = gameData.games[0];

            currScheduleObj.date = TZIntl.getDateTime(timeZone_Val, currGame.gameDate);

            let timeHour = (currScheduleObj.date.hour > 12 ? currScheduleObj.date.hour - 12 : (currScheduleObj.date.hour == 0 ? 12 : currScheduleObj.date.hour));
            let timeMin = (currScheduleObj.date.minute < 10 ? "0" + currScheduleObj.date.minute : currScheduleObj.date.minute);
            currScheduleObj.date.dateText = timeHour + ":" + timeMin;

            currScheduleObj.home = (currGame.teams.home.team.id == selectedTeam.id);

            let opponent = (currScheduleObj.home ?
                currGame.teams.away.team :
                currGame.teams.home.team);

            let opponentObj = selectedLeague.teams.find(team => team.id == opponent.id);

            currScheduleObj.opponent = {
                id: opponentObj.id,
                abbreviation: opponentObj.abbreviation,
                logo: "../../leagues/nhl/logos/" + opponentObj.id + "/Primary.png"
            }

            schedule.push(currScheduleObj);
        })
    } else if (schedule) {
        schedule.forEach(gameData => {
            gameData.date = TZIntl.getDateTime(timeZone_Val, gameData.date.toISOString());

            let timeHour = (gameData.date.hour > 12 ? gameData.date.hour - 12 : (gameData.date.hour == 0 ? 12 : gameData.date.hour));
            let timeMin = (gameData.date.minute < 10 ? "0" + gameData.date.minute : gameData.date.minute);
            gameData.date.dateText = timeHour + ":" + timeMin;
        })
    }

    scheduleRetrieved = true;

    CreateWallpaper();
}

function CreateWallpaper() {
    if (scheduleRetrieved && dropdownsPopulated) {
        $("#wallpaper-viewer").addClass("spinner");
        p.draw(selectedTeam.id, schedule);
    }
}

function DownloadWallpaper() {
    let imageUrl = $("#wallpaper").attr("src");
    let month = new Date().toLocaleString('default', { month: 'long' });
    let filename = selectedTeam.abbreviation + "_" + month;

    saveAs(imageUrl, filename);
}


const findLeagueById = (id) => {
    const league = Object.keys(leagues).find(league => leagues[league].id == id);
    return leagues[league];
}