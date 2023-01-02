var nhlJson, selectedTeam, schedule;

var scheduleRetrieved = false;
var dropdownsPopulated = false;
var teamSlider_mouseDownX = null;


$(document).ready(function() {
    $("#wallpaper").hide();
    onload();
});

function onload() {
    fetch("leagues/nhl/nhl.json")
        .then(response => response.json())
        .then(json => nhlJson = json)
        .then(PostJsonRetrieval);
}

function PostJsonRetrieval() {
    if (!nhlJson) return;

    PopulateTeams();
    PopulateTimeZones();
}


function PopulateTeams() {
    let $teamsDiv = $(".teamsCarousel");

    nhlJson.teams.sort((a, b) => a.name.localeCompare(b.name))

    jQuery.each(nhlJson.teams, (id, teamData) => {
        let html = '<a name="' + teamData.id + '" class="link">\
                        <article class="team" style=\'background-image: url("leagues/nhl/logos/' + teamData.id + '/Primary.png"); background-color: ' + Object.values(teamData.colours)[0] + ';\'></article>\
                    </a>';

        $teamsDiv.append(html);
    });

    $('.teamsCarousel').slick({
        slidesToShow: 16,
        slidesToScroll: 16,
        autoplay: true,
        autoplaySpeed: 3500,
        swipe: true,
        swipeToSlide: true,
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

    let $teams = $('.link');

    jQuery.each($teams, (i, team) => {
        $(team).mousedown((e) => {
            teamSlider_mouseDownX = e.pageX;
        });

        $(team).mouseup((e) => {
            if (teamSlider_mouseDownX >= e.pageX - 3 && teamSlider_mouseDownX <= e.pageX + 3) {
                let teamId = $(e.target).parent().attr('name');
                TeamSelected(teamId);
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
    jQuery.each(logos, (key, logo) => {
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

function TeamSelected(teamId) {
    if (selectedTeam && selectedTeam.id == teamId) return; //Same team, skip

    selectedTeam = nhlJson.teams.find(team => team.id == teamId);

    scheduleRetrieved = false;
    dropdownsPopulated = false;

    RetrieveSchedule();
    PopulateLogos();

    var $selectTeamError = $("#selectTeamError");
    $selectTeamError.fadeOut();

    var wallpaperEditor = $("#wallpaper-editor");
    $('html,body').animate({ scrollTop: wallpaperEditor.offset().top }, 'slow');
}

function RetrieveSchedule() {
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
                console.log("[RetrieveSchedule]: Retrieved schedule object is null");
                return;
            }
            let scheduleJson = games.dates;

            BuildSchedule(scheduleJson);
        }
    })
}

function BuildSchedule(scheduleJson = null) {
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

            let opponentObj = nhlJson.teams.find(team => team.id == opponent.id);

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
    if (scheduleRetrieved && dropdownsPopulated)
        p.draw(selectedTeam.id, schedule);
}

function DownloadWallpaper() {
    let imageUrl = $("#wallpaper").attr("src");
    let month = new Date().toLocaleString('default', { month: 'long' });
    let filename = selectedTeam.abbreviation + "_" + month;

    saveAs(imageUrl, filename);
}