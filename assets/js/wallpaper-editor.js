var nhlJson, selectedTeamId, schedule;

var scheduleRetrieved = false;
var dropdownsPopulated = false;


$(document).ready(function() {
    //var $wallpaper = $("#wallpaper");
    //$wallpaper.hide();

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
    //ResetWallpaper();
}


function PopulateTeams() {
    let $teamsDiv = $("#teams");

    $.ajax({
        url: "https://statsapi.web.nhl.com/api/v1/divisions",
        accepts: {
            text: "application/json"
        },
        success: function(response) {
            if (!response) {
                console.log("[PopulateTeams]: Retrieved divisions object is null");
                return;
            }

            console.log(response)

            jQuery.each(response.divisions, function(i, division) {
                let teamsInDivision = nhlJson.teams.filter(team => team.division == division.id);
                teamsInDivision.sort((a, b) => a.name.localeCompare(b.name));
                console.log(teamsInDivision);

                let html = '<article class="division">';

                jQuery.each(teamsInDivision, function(id, teamData) {
                    html += '<article class="team" style=\'background-image: url("leagues/nhl/logos/' + teamData.id + '/Primary.png"); background-color: ' + Object.values(teamData.colours)[0] + ';\'>\
                                <header>\
                                    <a id="' + teamData.id + '" class="link" onclick="TeamSelected(this)"><label class="teamLabel">' + teamData.name + '</label></a>\
                                </header>\
                            </article>';

                });
                html += '</article>';

                $teamsDiv.append(html);
            })
        }
    })
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

    $.ajax({
        url: "leagues/nhl/logos/" + selectedTeamId + "/",
        success: function(data) {
            $(data).find("a:contains(.png)").each(function() {
                var fileName = $(this).attr("title");
                let label = fileName.substring(0, fileName.indexOf(".png"));
                let option = new Option(label, fileName);

                if (label == "Primary")
                    $logo.prepend(option);
                else
                    $logo.append(option);
            });

            $logo.prop("selectedIndex", 0);

            PopulateColours();
            //PopulateStyles();
        }
    });
}

function PopulateColours() {
    var $colour = $("#Colour");
    $colour.empty();

    $colour.append(new Option("Black", "#000000"));
    let selectedTeam = nhlJson.teams.find(team => team.id == selectedTeamId);

    jQuery.each(selectedTeam.colours, function(name, hex) {
        $colour.append(new Option(name, hex));
    });

    dropdownsPopulated = true;

    CreateWallpaper();
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

function TeamSelected(element) {
    if (selectedTeamId == element.id) return; //Same team, skip

    selectedTeamId = element.id;
    scheduleRetrieved = false;
    dropdownsPopulated = false;

    RetrieveSchedule(selectedTeamId);
    PopulateLogos();

    var $selectTeamError = $("#selectTeamError");
    $selectTeamError.fadeOut();

    var wallpaperEditor = $("#wallpaper-editor");
    $('html,body').animate({ scrollTop: wallpaperEditor.offset().top }, 'slow');
}

function RetrieveSchedule(teamId) {
    schedule = null;

    let currDate = new Date(),
        yyyy = currDate.getFullYear(),
        mm = currDate.getMonth();

    let firstDay = new Date(yyyy, mm, 1).toISOString();
    firstDay = firstDay.substring(0, firstDay.indexOf("T"));

    let lastDay = new Date(yyyy, mm + 1, 0).toISOString();
    lastDay = lastDay.substring(0, lastDay.indexOf("T"));

    $.ajax({
        url: "https://statsapi.web.nhl.com/api/v1/schedule?teamId=" + teamId + "&startDate=" + firstDay + "&endDate=" + lastDay,
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

            currScheduleObj.home = (currGame.teams.home.team.id == selectedTeamId);

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
    console.log(schedule);

    CreateWallpaper();
}

function CreateWallpaper() {
    if (scheduleRetrieved && dropdownsPopulated)
        p.draw(selectedTeamId, schedule);
}

function DownloadWallpaper() {
    let teamObj = nhlJson.teams.find(team => team.id == selectedTeamId);

    let month = new Date().toLocaleString('default', { month: 'long' });
    let fileName = teamObj.abbreviation + "_" + month;

    p.exportHighResolution(fileName, selectedTeamId, schedule);
}