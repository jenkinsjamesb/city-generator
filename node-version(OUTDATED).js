const fs = require('fs');
const { createCanvas } = require('canvas');
const { getMaxListeners } = require('process');
const w = 1440, h = 900;
const canvas = createCanvas(w, h);
const ctx = canvas.getContext('2d');

rgbToHex = (r, g, b) => {
    let arr = [r, g, b];

    arr.forEach(function(n, i, arr) {
        arr[i] = arr[i].toString(16);
        arr[i] = arr[i].length == 1 ? "0" + arr[i] : arr[i];
    });
    return '#' + arr[0] + arr[1] + arr[2];
}

colorString = (rgb, a) => {
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + a + ')';
}

getLum = (r, g, b) => {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 100;
}

rand = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

flip = () => {
    return Math.random() < 0.5;
}

save = (i) => {
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('download' + i + '.png', buffer);
}

main = () => {
    //create grid
    //rand number for grid spacing, streets there depth 1
    //rand rare overpass curves 0-1, rand less rare lines and connectors between grids, depth > 1, 
    //depth val decides depth & width
    // lines, lowest depth first, then highesr, then scan over each pixel and assign random lights to light color pixels (streets)
    // the less depth, the colder the light should be, overpasses should be ~white

    //vars
    const al_min = 5, al_max = 10;
    const st_min = 10, st_max = 20, st_spacing = w / rand(st_min, st_max), st_width = rand(w / 200, w / 100);
    const offsetV = Math.random() * st_spacing, offsetH = Math.random() * st_spacing;
    const op_min = 5, op_max = 10;

    //black background
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, w, h);

    //substreets (alleys)
    ctx.strokeStyle = '#2A1F1A';
    ctx.lineWidth = 5;
    var sX = offsetH + -st_spacing, sY = offsetV + -st_spacing;
    for (let row = 0; row < (h + 2 * st_spacing) / st_spacing; row++) {
        for (let col = 0; col < (w + 2 * st_spacing) / st_spacing; col++) {
            ctx.beginPath();
            ctx.moveTo(sX, sY);

            let isDiagonal = Math.random() < 0.15; //15% chance of diagonal street connecting two mains
            if (isDiagonal) {
                ctx.lineTo(sX + rand(-2, 2) * st_spacing, sY + rand(-2, 2) * st_spacing);
            } else {
                let budget = st_spacing, pos = {x: sX, y: sY}, prevTheta;
                for (let i = 0; i < rand(al_min, al_max) && budget > 0; i++) {
                    let dist = rand(budget / 10, budget), theta = (Math.PI / 2) * rand(0, 4); //random cardinal direction
                    if (theta == prevTheta) theta = (Math.PI / 2) * rand(0, 4);
                    budget -= dist * i == 0 ? 0:1;
                    pos = {x: pos.x + Math.cos(theta) * dist, y: pos.y + Math.sin(theta) * dist}

                    if (i == 0) ctx.moveTo(pos.x, pos.y);
                    else ctx.lineTo(pos.x, pos.y);
                }
            }

            ctx.stroke();
            sX += st_spacing;
        }
        sX = offsetH + -st_spacing;
        sY += st_spacing;
    }

    //fill in main streets
    ctx.fillStyle = '#332C22';
    for (let i = offsetH; i < w; i += st_spacing) ctx.fillRect(i - st_width / 2, 0, st_width, h);
    for (let j = offsetV; j < h; j += st_spacing) ctx.fillRect(0, j - st_width / 2, w, st_width / 2);
    //TODO: larger diagonal aves, split grids

    //overpasses (bezierCurveTo)
    ctx.strokeStyle = '#3A3A3A';
    ctx.lineWidth = 10;
    for (let i = 0; i < rand(op_min, op_max); i++) {
        let f1 = flip(), f2 = flip();
        let oX = f1 ? (!f2 ? 0:w):offsetH + rand(-1, w / st_spacing) * st_spacing;
        let oY = !f1 ? (f2 ? 0:h):offsetV + rand(-1, h / st_spacing) * st_spacing;
        let ctl = {x1: offsetH + rand(5, 10) * st_spacing, y1: offsetV + rand(5, 10) * st_spacing,
                    x2: offsetH + rand(5, 10) * st_spacing, y2: offsetV + rand(5, 10) * st_spacing };
        let pos = {x: offsetH + rand(5, st_max) * st_spacing, y: offsetV + rand(5, st_max) * st_spacing};

        ctx.beginPath();
        ctx.moveTo(oX, oY);
        ctx.bezierCurveTo(ctl.x1, ctl.y1, ctl.x2, ctl.y2, pos.x, pos.y);
        //TODO: choose nearby point, create on/off ramps?
        //dir = (Math.PI / 2) * rand(0, 4), endpoint = {x: pos.x};
        ctx.stroke();
    }

    //lights
    //loop over, the higher the color, the greater the chance of a light
    let pixels = ctx.getImageData(0, 0, w, h).data; //arr in [r, g, b, a, r, g, b...]

    for (let i = 0; i < w * h / 500; i++) {
        let n = rand(0, w * h) * 4;
        let pixel = {r: pixels[n], g: pixels[n + 1], b: pixels[n + 2], a: pixels[n + 3]};
        let luminance = getLum(pixel.r, pixel.g, pixel.b) / (getLum(0x3A, 0x3A, 0x3A) - getLum(0x12, 0x12, 0x12) + Math.random(-10, 10) / 100); //relative luminance calc

        if (Math.random() < luminance / 4) { //chance of light weighted by lum
            let pos = {x: n / 4 % w, y: Math.floor(n / 4 / w)}, r = Math.floor(luminance * rand(50, 75));
            let gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r);
            let color = {};

            //red > yellow > white
            //wildcard blue, purple
            if (luminance < 1) {
                color = Math.random() < 0.40 ? {r: rand(200, 255), g: rand(0, 150), b: rand(0, 50)}:
                                {r: rand(150, 255), g: rand(150, 200), b: rand(0, 50)};
            } else {
                color = {r: rand(200,255), g: rand(200,255), b: rand(200,255)};
                if (Math.random() < 0.10) {
                    color = flip() ? 
                        {r: rand(200,255), g: rand(100,150), b: rand(100,150)}:
                        {r: rand(100,150), g: rand(100,150), b: rand(200,255)};
                }
            }
            
            gradient.addColorStop(0, colorString(color, 1.0));
            gradient.addColorStop(0.1, colorString(color, 0.25));
            gradient.addColorStop(0.25, colorString(color, 0.1));
            gradient.addColorStop(1, colorString(color, 0.0));
            ctx.fillStyle = gradient;
            ctx.fillRect(pos.x - r, pos.y - r, r * 2, r * 2);
        }
    }
    save(0);
}
main();