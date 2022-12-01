var nhlJson, selectedTeamId;

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
    //ResetWallpaper();
}

function PopulateTeams() {
    let $teamsDiv = $("#teams");

    jQuery.each(nhlJson.teams, function(id, teamData) {
        let html = '<article style=\'background-image: url("leagues/nhl/logos/' + teamData.id + '/Primary.png");\'>\
                        <span class="image">\
                            <img src="leagues/nhl/logos/' + teamData.id + '/Primary.png"/>\
                        </span>\
                        <header>\
                            <a id="' + teamData.id + '" class="link" onclick="TeamSelected(this)"><label class="teamLabel">' + teamData.name + '</label></a>\
                        </header>\
                    </article>';

        $teamsDiv.append(html);
    });
}

function ResetWallpaper() {
    var $wallpaper = $("#wallpaper");
    var $logo = $("#Logo");
    var $month = $("#Month");
    var $style = $("#Style");
    var $timeZone = $("#TimeZone");
    var $amoled = $("#amoled");
    var $wallpaperDownload = $("#wallpaperDownload");

    $wallpaper.attr('src', '');

    if (selectedTeamId == null)
        $logo.val('');

    $month.val('');
    $style.val('');
    $timeZone.val('');
    $amoled.prop('checked', false);

    $logo.attr("disabled", true);
    $logo.parent().addClass("disabled");
    $month.attr("disabled", true);
    $month.parent().addClass("disabled");
    $style.attr("disabled", true);
    $style.parent().addClass("disabled");
    $timeZone.attr("disabled", true);
    $timeZone.parent().addClass("disabled");
    $amoled.attr("disabled", true);
    $amoled.parent().addClass("disabled");

    $wallpaperDownload.parent().addClass("disabled");
}

function SetWallpaper(logo, style = null) {
    var $wallpaper = $("#wallpaper");
    var $wallpaperDownload = $("#wallpaperDownload");

    var $amoled = $("#amoled");
    var amoled = $amoled.prop('checked');

    let imgUrl = selectedTeamId + "/";

    switch (style != null) {
        case false:
            imgUrl += (amoled) ?
                wallpapersJson.teams[selectedTeamId].currentMonth[logo].amoled :
                wallpapersJson.teams[selectedTeamId].currentMonth[logo].default;
            break;
        case true:
            let imgUrlStyle = wallpapersJson.teams[selectedTeamId].currentMonth[logo][style];
            if (imgUrlStyle != null) {
                imgUrl += "CurrentMonth/";
                imgUrl += (amoled) ?
                    imgUrlStyle.amoled :
                    imgUrlStyle.default;
            } else {
                imgUrl += (amoled) ?
                    imgUrl.amoled :
                    imgUrl.default;
            }
            break;
    }

    $wallpaper.attr('src', "wallpapers/" + imgUrl);
    $wallpaperDownload.attr('href', "wallpapers/" + imgUrl);
    $wallpaperDownload.parent().removeClass("disabled");

    $wallpaper.fadeIn('fast');
}

function CheckWallpaper() {
    var $logo = $("#Logo");
    var logo_Val = $logo.val();

    if (selectedTeamId != null) {
        $logo.attr("disabled", false);
        $logo.parent().removeClass("disabled");
    }

    if (!logo_Val)
        return;

    //var $style = $("#Style");
    var $timeZone = $("#TimeZone");

    // let hasStyles = HasStyles(logo_Val);

    // $style.attr("disabled", !hasStyles);
    // if (hasStyles)
    //     $style.parent().removeClass("disabled");
    // else {
    //     $style.parent().addClass("disabled");
    //     $style.val('');
    //     $timeZone.val('');
    // }

    //var style_Val = $style.val();

    //var timeZone_Val = $timeZone.val();

    // var $amoled = $("#amoled");

    // let hasAmoled = HasAmoled(logo_Val, style_Val, timeZone_Val);

    $amoled.attr("disabled", !hasAmoled);
    if (hasAmoled)
        $amoled.parent().removeClass("disabled");
    else {
        $amoled.parent().addClass("disabled");
        $amoled.prop('checked', false);
    }

    //if (!style_Val || style_Val == '') {
    $timeZone.val('');
    SetWallpaper(logo_Val);
    return;
    //}

    $timeZone.val('2');
    //$timeZone.attr("disabled", false);
    //$timeZone.parent().removeClass("disabled");

    //if (timeZone_Val == '') {
    SetWallpaper(logo_Val, style_Val);
    //}
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

            $logo.prepend(new Option('', null));
            $logo.val('');

            //PopulateStyles();
        }
    });
}

// function PopulateStyles() {
//     var $style = $("#Style");

//     $style.empty();
//     $style.append(new Option());

//     for (let style of wallpapersJson.styles) {
//         let key = Object.keys(style)[0];
//         let label = Object.values(style)[0];
//         $style.append(new Option(label, key));
//     }
// }

function HasStyles(logo) {
    var currLogoJson = wallpapersJson.teams[selectedTeamId].currentMonth[logo];

    var firstStyleKey = Object.keys(wallpapersJson.styles[0])[0];

    return (currLogoJson[firstStyleKey] != null);
}

function GetAmoled(logo, style = null, timeZone = null) {
    var hasStyle = (style != null && style !== '')
    var hasTimeZone = (timeZone != null && timeZone != '');

    let imgUrl;
    switch (hasStyle) {
        case false:
            imgUrl = wallpapersJson.teams[selectedTeamId].currentMonth[logo].amoled;
            break;
        case true:
            imgUrl = wallpapersJson.teams[selectedTeamId].currentMonth[logo][style].amoled;
            break;
    }

    if (imgUrl != null)
        imgUrl = selectedTeamId + "/" + imgUrl

    return imgUrl;
}

// function HasAmoled(logo, style = '', timeZone = '') {
//     let imgUrl = GetAmoled(logo, style, timeZone);

//     return (imgUrl != null);
// }

function TeamSelected(element) {
    let resetWallpaper = (selectedTeamId != null)

    selectedTeamId = element.id;

    PopulateLogos();

    // if (resetWallpaper) {
    //     var $wallpaper = $("#wallpaper");
    //     $wallpaper.fadeOut('fast', function() {
    //         ResetWallpaper();
    //         CheckWallpaper();
    //     });
    // } else
    //     CheckWallpaper();

    var $selectTeamError = $("#selectTeamError");
    $selectTeamError.fadeOut();

    var wallpaperEditor = $("#wallpaper-editor");
    $('html,body').animate({ scrollTop: wallpaperEditor.offset().top }, 'slow');
}