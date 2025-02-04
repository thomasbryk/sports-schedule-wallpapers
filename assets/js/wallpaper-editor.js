var leagues = null;

var selectedTeam, selectedLeague, schedule;
var dropdownsPopulated = false;
var leagueSlider_mouseDownX = null;
var teamSlider_mouseDownX = null;


$(document).ready(function() {
    $("#wallpaper").hide();
    $("#scheduleError").hide();
    $("#scheduleRetry").hide();
    $("#TimeZone").val("");

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

            Promise.all(promises).then(() => {
                PopulateCarousels();
                PopulateTimeZones();
            })
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

function PopulateCarousels() {
    let $leaguesDiv = $("#leaguesCarousel");
    let $mainDiv = $("#main");

    $.each(leagues, (i) => {
        let currLeague = leagues[i];

        let leagueHtml = '<a name="' + currLeague.id + '" class="league block link">\
                        <article class="block leagueBlock" style=\'background-image: url("' + currLeague.path + 'emblem.png");\'></article>\
                    </a>';

        $leaguesDiv.append(leagueHtml);

        let $newTeamDiv = $('<div id="' + currLeague.id + '" class="teamsCarousel inner"></div>');
        $mainDiv.append($newTeamDiv);

        let teams = currLeague.teams;
        teams.sort((a, b) => a.name.localeCompare(b.name))

        $.each(teams, (id, teamData) => {
            let teamHtml = '<a name="' + teamData.id + '" league=' + currLeague.id + ' class="team block link">\
                        <article class="block" style=\'background-image: url("' + currLeague.path + 'logos/' + teamData.id + '/' + Object.values(teamData.logos)[0] + '"); background-color: ' + Object.values(teamData.colours)[0] + ';\'></article>\
                    </a>';

            $newTeamDiv.append(teamHtml);
        });

        $newTeamDiv.hide();
    });

    $teamsCarousel = $('.teamsCarousel');

    $leaguesDiv.slick({
        slidesToShow: 4,

        responsive: [{
            breakpoint: 850,
            settings: {
                slidesToShow: 2
            }
        }]
    });

    $teamsCarousel.slick({
        slidesToShow: 16,
        slidesToScroll: 16,
        autoplaySpeed: 3500,
        swipe: true,
        touchMove: true,

        responsive: [{
                breakpoint: 1100,
                settings: {
                    slidesToShow: 8,
                    slidesToScroll: 8
                }
            },
            {
                breakpoint: 850,
                settings: {
                    slidesToShow: 6,
                    slidesToScroll: 6
                }
            },
            {
                breakpoint: 550,
                settings: {
                    mobileFirst: true,
                    slidesToShow: 4,
                    slidesToScroll: 4
                }
            }
        ]
    });

    let $leagues = $('.league');

    $.each($leagues, (i, league) => {
        $(league).mousedown((e) => {
            leagueSlider_mouseDownX = e.pageX;
        });

        $(league).mouseup((e) => {
            if (leagueSlider_mouseDownX >= e.pageX - 3 && leagueSlider_mouseDownX <= e.pageX + 3) {
                let $parent = $(e.target).parent();
                let leagueId = $parent.attr("name");
                $parent.addClass('selected');

                LeagueSelected(leagueId);
            }
        });
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


    if ($("#TimeZone").prop('disabled')) $timeZone.val("")
    else $timeZone.val(Intl.DateTimeFormat().resolvedOptions().timeZone);
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

    jQuery.each(selectedTeam.colours, (name, hex) => {
        $colour.append(new Option(name, hex));
    });
    $colour.append(new Option("Black", "#000000"));

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

function LeagueSelected(leagueId) {
    let $visibleLeagues = $(".teamsCarousel:visible");

    //Check if league is re-selected - close the teams carousel if so
    if ($visibleLeagues.length > 0) {
        let $currLeague = $($visibleLeagues[0]);
        let currLeagueId = $currLeague[0].id;
        let $currLeagueButton = $('a.league[name=' + currLeagueId + ']');

        $('button.slick-arrow:visible').fadeOut('fast');
        $currLeagueButton.removeClass('selected');
        $currLeague.slick('slickPause');
        $currLeague.slideUp();

        if (currLeagueId == leagueId) {
            return; //Same league, exiting..
        }
    }

    //Open newly selected league
    let $selectedLeague = $('.teamsCarousel#' + leagueId + '');

    if ($selectedLeague.length > 0) {
        let $leagueButtons = $selectedLeague.children('button.slick-arrow');
        $leagueButtons.hide();

        $($selectedLeague[0]).slick('slickGoTo', 0);
        $($selectedLeague[0]).slideDown(() => {
            $leagueButtons.fadeIn();
            $($selectedLeague[0]).slick('slickPlay')
        });
    }

    selectedLeague = findLeagueById(leagueId);
}

function TeamSelected(teamId) {
    if (selectedTeam && selectedTeam.id == teamId) return; //Same team, skip

    $("#wallpaper-viewer").addClass("spinner");

    $selectedTeams = $('a.team.selected');
    $.each($selectedTeams, (i, team) => {
        let $team = $(team);
        if (!($team.league == selectedLeague.id && $team.id == teamId)) {
            $team.removeClass('selected');
        }
    });

    let $team = $('a.team[league=' + selectedLeague.id + '][name=' + teamId + ']');
    $team.addClass('selected');
    $team.parent().parent().parent().slick('slickPause');

    selectedTeam = selectedLeague.teams.find(team => team.id == teamId);
    schedule = null;

    dropdownsPopulated = false;

    var $selectTeamError = $("#selectTeamError");
    $selectTeamError.fadeOut();

    var wallpaperEditor = $("#wallpaper-editor");
    $('html,body').animate({ scrollTop: wallpaperEditor.offset().top }, 'slow').promise().done(() => {
        PopulateLogos();
        RetrieveSchedule(firstSelection = true);
    });
}

function RetrieveSchedule(firstSelection = null) {
    let currDate = new Date(),
        yyyy = currDate.getFullYear(),
        mm = currDate.getMonth();

    let firstDay = new Date(yyyy, mm, 1).toISOString();
    firstDay = firstDay.substring(0, 10);

    let lastDay = new Date(yyyy, mm + 1, 0).toISOString();
    lastDay = lastDay.substring(0, lastDay.indexOf("T"));

    let includeSchedule = $('#Schedule').prop('checked');

    if (includeSchedule || firstSelection) {
        switch (selectedLeague.id) {
            case 1:
                RetrieveSchedule_MLB(firstDay, lastDay);
                break;
            case 2:
                RetrieveSchedule_NHL(firstDay, lastDay);
                break;
        }
    } else if (!firstSelection && schedule == null) {
        enableScheduleControls(enable = false);
        return;
    } else {
        CreateWallpaper();
    }

}

function RetrieveSchedule_MLB(firstDay, lastDay) {
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

            let scheduleArr = [];

            $.each(games.dates, (i, date) => {
                let gamesOnThisDate = date.games.filter(game => (game.teams.away.team.id == selectedTeam.id) || (game.teams.home.team.id == selectedTeam.id));
                $.each(gamesOnThisDate, (j, game) => {
                    scheduleArr.push(game);
                });
            });

            if (scheduleArr.length <= 0) scheduleArr = null;

            BuildSchedule(scheduleArr);
        }
    });
}

function RetrieveSchedule_NHL(firstDay, lastDay) {
    const month_querystring = firstDay.substring(0, 7);

    $.ajax({
            type: 'GET',
            url: "https://api.allorigins.win/get?url=" + encodeURIComponent("https://api-web.nhle.com/v1/club-schedule/" + selectedTeam.abbreviation + "/month/" + month_querystring),
            async: false,
            cache: false,
            dataType: 'json',
            crossOrigin: true,
            success: function(res) {
                var data = JSON.parse(res.contents);
                var games = data.games;
                
                if (!games) {
                    console.log("[RetrieveSchedule_NHL]: Retrieved schedule object is null");
                    return null;
                }

                let scheduleArr = [];
                $.each(games, (i, game) => {
                    if (game.gameType == 2 || game.gameType == 3) //Regular season and playoffs
                        scheduleArr.push(game);
                });

                if (scheduleArr.length <= 0) scheduleArr = null;

                BuildSchedule(scheduleArr);
            }
        })
        .fail(function(xhr, status, error) { 
            console.log("[RetrieveSchedule_NHL] GET request to NHL API failed. ~Result: " + status + " " + error + " " + xhr.status + " " + xhr.statusText);
            BuildSchedule();
        });
}

function BuildSchedule(scheduleArr = null) {
    $("#wallpaper-viewer").addClass("spinner");

    let leaguePath = selectedLeague.path;
    let timeZone_Val = $("#TimeZone").val();

    if (scheduleArr) {
        enableScheduleControls(enable = true);
        schedule = [];

        scheduleArr.forEach(currGame => {
            let currScheduleObj = {};

            currScheduleObj.date = TZIntl.getDateTime(timeZone_Val, currGame.gameDate);

            let timeHour = (currScheduleObj.date.hour > 12 ? currScheduleObj.date.hour - 12 : (currScheduleObj.date.hour == 0 ? 12 : currScheduleObj.date.hour));
            let timeMin = (currScheduleObj.date.minute < 10 ? "0" + currScheduleObj.date.minute : currScheduleObj.date.minute);
            currScheduleObj.date.dateText = timeHour + ":" + timeMin;
            let opponent = {};
            if (selectedLeague.name == "MLB") {
            currScheduleObj.home = (currGame.teams.home.team.id == selectedTeam.id);

                opponent = (currScheduleObj.home ?
                currGame.teams.away.team :
                currGame.teams.home.team);
            } else {
                currScheduleObj.home = (currGame.homeTeam.id == selectedTeam.id);

                    opponent = (currScheduleObj.home ?
                    currGame.awayTeam :
                    currGame.homeTeam);
            }

            let opponentObj = selectedLeague.teams.find(team => team.id == opponent.id);

            currScheduleObj.opponent = {
                id: opponentObj.id,
                abbreviation: opponentObj.abbreviation,
                logo: "../../" + leaguePath + "logos/" + opponentObj.id + "/Primary.png"
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
    } else {
        schedule = null;
        enableScheduleControls(enable = false);
    }

    CreateWallpaper();
}

function CreateWallpaper() {
    if (dropdownsPopulated) {
        $("#wallpaper-viewer").addClass("spinner");

        p.draw(selectedLeague, selectedTeam, schedule);
    }
}

function DownloadWallpaper() {
    let imageUrl = $("#wallpaper").attr("src");
    let month = new Date().toLocaleString('default', { month: 'long' });
    let filename = selectedTeam.abbreviation + "_" + month;

    saveAs(imageUrl, filename);
}

///// Helper functions /////
const findLeagueById = (id) => {
    const league = Object.keys(leagues).find(league => leagues[league].id == id);
    return leagues[league];
}

function enableScheduleControls(enable) {
    if (enable) {
        $("#scheduleError").fadeOut("fast");
        $("#scheduleRetry").fadeOut("fast");
        $("#TimeZone").css({ "opacity": "100%" });
    }
    else{
         $("#scheduleError").fadeIn("fast");
         $("#scheduleRetry").fadeIn("fast");
         $("#TimeZone").css({ "opacity": "35%" });
    }

    $("#Schedule").prop('disabled', !enable);
    $("#Schedule").prop('checked', enable);
    $("#TimeZone").prop('disabled', !enable);
}

function scheduleRetryOnClick() {
    $("#wallpaper-viewer").addClass("spinner");
    disableRetry ();
    RetrieveSchedule(firstSelection = true);
}

function disableRetry () {
    $("#scheduleRetry").addClass('disabled');

    return new Promise((resolve) => {
      setTimeout(() => {
        $("#scheduleRetry").removeClass('disabled');
        resolve();
    }, 4000)
    })
}
