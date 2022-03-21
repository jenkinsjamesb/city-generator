const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const w = canvas.width, h = canvas.height;

//probability values
const rand = (min, max) => { return Math.floor(Math.random() * (max - min + 1) + min); }
const al_min = 5, al_max = 10;
const st_min = 25, st_max = 50, st_spacing = w / rand(st_min, st_max), st_width = rand(w / 400, w / 250);
const offsetV = Math.random() * st_spacing, offsetH = Math.random() * st_spacing;
const op_min = 5, op_max = 10;

colorString = (rgb, a) => {
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + a + ')';
}

getLum = (r, g, b) => {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 100;
}

flip = () => {
    return Math.random() < 0.5;
}

//filler functions
mainsPattern = (w, h) => {
    //context vars
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = w;
    patternCanvas.height = h;
    const ctxP = patternCanvas.getContext("2d");
    
    //black background
    ctxP.fillStyle = '#121212';
    ctxP.fillRect(0, 0, w, h);

    //substreets (alleys)
    ctxP.strokeStyle = '#2A1F1A';
    ctxP.lineWidth = st_width / 3;
    var sX = offsetH + -st_spacing, sY = offsetV + -st_spacing;
    for (let row = 0; row < (h + 2 * st_spacing) / st_spacing; row++) {
        for (let col = 0; col < (w + 2 * st_spacing) / st_spacing; col++) {
            ctxP.beginPath();
            ctxP.moveTo(sX, sY);

            let isDiagonal = Math.random() < 0.15; //15% chance of diagonal street connecting two mains
            if (isDiagonal) {
                ctxP.lineTo(sX + rand(-2, 2) * st_spacing, sY + rand(-2, 2) * st_spacing);
            } else {
                let budget = st_spacing, pos = {x: sX, y: sY}, prevTheta;
                for (let i = 0; i < rand(al_min, al_max) && budget > 0; i++) {
                    let dist = rand(budget / 10, budget), theta = (Math.PI / 2) * rand(0, 4); //random cardinal direction
                    if (theta == prevTheta) theta = (Math.PI / 2) * rand(0, 4);
                    budget -= dist * i == 0 ? 0:1;
                    pos = {x: pos.x + Math.cos(theta) * dist, y: pos.y + Math.sin(theta) * dist}

                    if (i == 0) ctxP.moveTo(pos.x, pos.y);
                    else ctxP.lineTo(pos.x, pos.y);
                }
            }

            ctxP.stroke();
            sX += st_spacing;
        }
        sX = offsetH + -st_spacing;
        sY += st_spacing;
    }

    //fill in main streets
    ctxP.fillStyle = '#332C22';
    for (let i = offsetH; i < w; i += st_spacing) ctxP.fillRect(i - st_width / 2, 0, st_width, h);
    for (let j = offsetV; j < h; j += st_spacing) ctxP.fillRect(0, j - st_width / 2, w, st_width / 2);
    //TODO: larger diagonal aves

    //return
    return ctxP.createPattern(patternCanvas, 'repeat');
}

fillStreets = (pointsArr) => {
    ctx.save();
    ctx.beginPath();

    pointsArr.forEach((pt, i) => {
        if (i == 0) {
            ctx.moveTo(pt.x, pt.y);
            return;
        }
        ctx.lineTo(pt.x, pt.y);
    });

    ctx.rotate(Math.random() * Math.PI);
    ctx.fillStyle = mainsPattern(w, h);
    ctx.fill();
    ctx.restore();
}

fillLights = () => {
    let pixels = ctx.getImageData(0, 0, w, h).data; //arr in [r, g, b, a, r, g, b...]

    for (let i = 0; i < w * h / 500; i++) {
        let n = rand(0, w * h) * 4;
        let pixel = {r: pixels[n], g: pixels[n + 1], b: pixels[n + 2], a: pixels[n + 3]};
        let luminance = getLum(pixel.r, pixel.g, pixel.b) / (getLum(0x3A, 0x3A, 0x3A) - getLum(0x12, 0x12, 0x12) + Math.random(-10, 10) / 100); //relative luminance calc

        if (Math.random() < luminance / 4) { //chance of light weighted by lum
            let pos = {x: n / 4 % w, y: Math.floor(n / 4 / w)}, r = Math.floor(luminance * rand(50, 75)); //radius weighted by lum
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
}

main = () => {
    //fill in grids
    let y1 = rand(0, h), y2 = h - y1;
    fillStreets([{x: 0, y:0}, {x: w, y: 0}, {x: w, y: h}, {x: 0, y: h}]);
    fillStreets([{x: 0, y:0}, {x: w, y: 0}, {x: w, y: y2}, {x: 0, y: y1}]);

    //main street
    ctx.beginPath();
    ctx.moveTo(0, y1);
    ctx.lineTo(w, y2);
    ctx.strokeStyle = '#3A3A3A';
    ctx.lineWidth = st_width * 2.5;
    ctx.stroke();

    //overpasses
    ctx.strokeStyle = '#3A3A3A';
    ctx.lineWidth = st_width * 2;
    for (let i = 0; i < rand(op_min, op_max); i++) {
        let oX = rand(0, w), oY = (y2 - y1) / w * oX + y1; //origin coords
        let angle = Math.atan((y2 - y1) / w) //angle of main street
        let dist = rand(0, w * 2 + h * 2);

        let pos = {}, ctl = {};
        let offsetAngle = angle + (Math.random() < 0.5 ? 0:Math.PI);
        let ctlDist1 = rand(5, 10) * st_spacing;

        ctl.x1 = oX + Math.cos(offsetAngle) * ctlDist1;
        ctl.y1 = oY + Math.sin(offsetAngle) * ctlDist1;
        
        if (dist < w) {
            pos.x = dist;
            pos.y = 0;
        } else if (dist < w + h) {
            pos.x = w;
            pos.y = dist - w;
        } else if (dist < 2 * w + h) {
            pos.x = w - (dist - (w + h))
            pos.y = h;
        } else {
            pos.x = 0;
            pos.y = h - (dist - (2 * w + h));
        }

        ctl.x2 = pos.x + rand(0, 5) * st_spacing;
        ctl.y2 = pos.y + rand(0, 5) * st_spacing;
  
        ctx.beginPath();
        ctx.moveTo(oX, oY);
        ctx.bezierCurveTo(ctl.x1, ctl.y1, ctl.x2, ctl.y2, pos.x, pos.y);
        //TODO: choose nearby point, create on/off ramps?
        //dir = (Math.PI / 2) * rand(0, 4), endpoint = {x: pos.x};
        ctx.stroke();
    }

    //lights
    fillLights();

    document.body.style.background = "url(" + canvas.toDataURL() + ")";
}
main();