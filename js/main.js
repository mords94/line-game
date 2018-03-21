let canvas = $('canvas')[0];
const context = canvas.getContext('2d');
const requestAnimationFrame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;



(function () {
    const GRID_WIDTH = 100;
    const GRID_HEIGHT = 100;
    const BALL_SIZE = 8;
    const DEGREE_RANDOM_THRESHOLD = 90;
    const DEGREE_RANDOM_DISPERSION = 30;
    const GAME_SPEED = 3;
    const CURSOR_WIDTH = 15;
    const CURSOR_HEIGHT = 20;
    const PATH_WIDTH = 1;
    const KEY_UP = 38;
    const KEY_DOWN = 40;
    const KEY_LEFT = 37;
    const KEY_RIGHT = 39;
    const BORDER = 31;
    let outside = true;
    let gameInstance;
    let polygon = [];
    let polygons = [];
    let balls = [];
    let cursor = {
        x: 0,
        y: 0,
        direction: getDirection('right'),
        rotate: 0,
        points: []
    };
    let cursorMove = false;



    window.addEventListener('resize', resizeCanvas, false);
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
    resizeCanvas();
    init();

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;


        refresh();
    }

    function refresh() {
        drawBorder();
        drawField();
        drawPolygons();
        drawPath();
        drawCursor();
        drawBalls();
        moveBalls(GAME_SPEED);

        if (cursorMove) {
            moveCursor(GAME_SPEED);
        }


        requestAnimationFrame(refresh);
    }

    function init() {
        createOneBall();
        polygon = [];
        createCursor(BORDER, BORDER);

    }

    function drawPolygons() {

        polygons.forEach(polygon => {
            context.beginPath();
            if (polygon.length > 0) {
                context.moveTo(polygon[0].x, polygon[0].y);
            }
            polygon.forEach((point, index) => {
                if (index !== 0) {
                    context.lineTo(point.x, point.y);
                }
            });

            context.fillStyle = 'blue';
            context.fill();
            context.closePath();
        });
        /*
         polygons.forEach((point, index) => {
         if (index === 0) {
         context.moveTo(point.x, point.y);
         } else {
         context.lineTo(point.x, point.y);
         }
         });
         */
    }

    function onKeyDown(event) {
        if (!cursorMove) {


            const keyMap = {
                [KEY_UP]: 'up',
                [KEY_DOWN]: 'down',
                [KEY_LEFT]: 'left',
                [KEY_RIGHT]: 'right',
            };

            if (keyMap.hasOwnProperty(event.keyCode)) {
                const direction = keyMap[event.keyCode];

                const sameDirection = toDegrees(cursor.direction) === toDegrees(getDirection(direction));

                if (!outside && !sameDirection) {
                    savePoint({x: cursor.x, y: cursor.y});
                }

                rotateCursorTo(keyMap[event.keyCode]);
            }


            cursorMove = true;
        }
    }

    function onKeyUp() {
        cursorMove = false;
    }

    function savePoint(point) {
        polygon.push(point);
    }


    function drawBalls() {
        balls.forEach(ball => {
            circle(ball.position, BALL_SIZE, 'red');
        });
    }

    function restart() {
        clearInterval(gameInstance);
        cursor.x = 0;
        cursor.y = 0;
        cursor.direction = getDirection('right');
        cursor.rotate = 0;
        cursor.points = [];

        createCursor(BORDER, BORDER);
        init();
    }

    function moveCursor(moveLength) {
        let translatedCenter = translate({x: cursor.x, y: cursor.y}, moveLength, cursor.direction);

        if (isOut(translatedCenter.x, translatedCenter.y)) {
            return;
        }


        if (intersectPolygon(translatedCenter)) {
            restart();
            return;
        }

        if (isOnBorder(translatedCenter.x, translatedCenter.y)) {
            if (!outside) {
                savePoint({x: translatedCenter.x, y: translatedCenter.y});


                completePolygon();
                polygons.push(polygon);
                polygon = [];
            }
            outside = true;
        } else {
            if (outside) {
                savePoint({x: cursor.x, y: cursor.y});
            }
            outside = false;
        }

        // if(intersectBigPolygon(translatedCenter)) {
        //     savePoint({x: translatedCenter.x, y: translatedCenter.y});
        //     console.log("INTERSECTBG", cursor.x, cursor.y, context.getImageData(cursor.x, cursor.y, 1,1).data);
        //     completePolygon();
        //     polygons.push(polygon);
        //     polygon = [];
        // }


        const points = cursor.points.map(point => {
            return translate(point, moveLength, cursor.direction);
        });


        cursor = {
            ...cursor,
            ...translatedCenter,
            points: points,
        };

        console.log(polygon, gameInstance);

    }

    function completePolygon() {
        const pointCount = polygon.length;
        const last = polygon[pointCount-1];
        const first = polygon[0];

        if(pointCount === 2||(pointCount % 2 !== 0 && pointCount > 2)) {
            if(last.x === BORDER || last.x === getWindow().x - BORDER) {
                savePoint({x: last.x, y: last.y > getWindow().y / 2 ? getWindow().y - BORDER : BORDER});
                savePoint({x: first.x, y: last.y > getWindow().y / 2 ? getWindow().y - BORDER : BORDER});
            } else {
                savePoint({x: last.x > getWindow().x / 2 ? getWindow().x - BORDER : BORDER, y: last.y});
                savePoint({x: last.x > getWindow().x / 2 ? getWindow().x - BORDER : BORDER, y: first.y});
            }
        }
    }

    function intersectPolygon(segment) {
        if (polygon.length < 4) return false;

        for (let i = 0; i < polygon.length - 2; i++) {
            if (segmentIntersect(polygon[i], polygon[i + 1], polygon[polygon.length - 1], segment)) {
                return true;
            }
        }

        return false;
    }

    function intersectBigPolygon(segment) {

        if (polygon.length < 1) return false;

        for (let j = 0; j < polygons.length; j++) {
            const rect = polygons[j];
            for (let i = 0; i < rect.length - 1; i++) {

                if (segmentIntersect(rect[i], rect[i + 1], polygon[polygon.length-1], segment)) {

                    console.log(rect[i], rect[i + 1], polygon[polygon.length-1], segment);

                    return true;
                }
            }
        }

        return false;
    }

    function rotateDirection(a, b, c) {
        //(c-a)*(b-a)
        return pointMultiplication(pointSubtraction(c, a), pointSubtraction(b, a));
    }

    function segmentIntersect(a, b, c, d) {

        const e = rotateDirection(c, d, a);
        const f = rotateDirection(c, d, b);
        const g = rotateDirection(a, b, c);
        const h = rotateDirection(a, b, d);
        if (e * f < 0 && g * h < 0) {
            return true;
        }
        if (e === 0 && onSegment(c, d, a)) {
            return true;
        }
        if (f === 0 && onSegment(c, d, b)) {
            return true;
        }
        if (g === 0 && onSegment(a, b, c)) {
            return true;
        }
        if (h === 0 && onSegment(a, b, d)) {
            return true;
        }

        return false;
    }

    function onSegment(a, b, c) {
        return Math.min(a.x, b.x) <= c.x && Math.max(a.x, b.x) >= c.x && Math.min(a.y, b.y) <= c.y && Math.max(a.y, b.y) >= c.y;
    }

    function pointMultiplication(a, b) {
        return a.x * b.y - b.x * a.y;
    }

    function pointSubtraction(a, b) {
        return {x: a.x - b.x, y: a.y - b.y};
    }

    function pointInPolygon(point) {

    }

    const sortPolygonPoints = (polygon) => polygon.sort((a, b) => a.x - b.x);


    function isOut(x, y) {
        return outX(x) || outY(y);
    }

    function isOnBorder(x, y) {
        return outX(x, 1) || outY(y, 1);
    }

    function isCursorOut() {

    }

    function moveBalls(moveLength) {
        balls = balls.map(ball => {
            let direction = ball.direction;
            let translated = translate(ball.position, moveLength, ball.direction);

            if (outX(translated.x + BALL_SIZE) ||
                outX(translated.x - BALL_SIZE) ||
                outY(translated.y + BALL_SIZE) ||
                outY(translated.y - BALL_SIZE)) {
                direction = toRadians((toDegrees(direction) - 180) +
                    (Math.round((Math.random() * (DEGREE_RANDOM_DISPERSION) + DEGREE_RANDOM_THRESHOLD - DEGREE_RANDOM_DISPERSION)) + 180));
            }

            return {
                ...ball,
                direction: direction,
                position: translate(ball.position, moveLength, direction)
            }
        })
    }

    function createOneBall() {
        balls.push({
            position: getPosition('middle'),
            direction: getRandomDirection(),
        });
    }

    function createCursor(x, y) {
        cursor.points = [];
        cursor.points.push({
            x: x - CURSOR_HEIGHT / 2,
            y: y + CURSOR_WIDTH / 2,
        });

        cursor.points.push({
            x: x + CURSOR_HEIGHT,
            y: y,
        });

        cursor.points.push({
            x: x - CURSOR_HEIGHT / 2,
            y: y - CURSOR_WIDTH / 2,
        });

        cursor.x = x;
        cursor.y = y;

    }

    function resetCursor() {
        cursor.points = [];
    }

    function rotateCursor(degree) {
        cursor = {
            ...cursor,
            points: cursor.points.map(point => rotate(point, degree, {x: cursor.x, y: cursor.y}))
        }

    }

    function rotateCursorTo(direction) {
        const directionNumber = getDirection(direction);


        if (!outside && Math.abs(toDegrees(cursor.direction) - toDegrees(directionNumber)) === 180) {
            return;
        }
        rotateCursor(toRadians(-toDegrees(cursor.direction)));
        rotateCursor(directionNumber);

        cursor.direction = directionNumber;
    }

    function drawPath() {
        context.beginPath();
        context.strokeStyle = "#FF0000";
        context.lineWidth = PATH_WIDTH;
        polygon.forEach((point, index) => {
            if (index === 0) {
                context.moveTo(point.x, point.y);
            } else {
                context.lineTo(point.x, point.y);
            }
        });
        context.lineTo(cursor.x, cursor.y);
        context.stroke();
        context.closePath();
    }


    function drawCursor() {
        context.beginPath();
        context.moveTo(cursor.x, cursor.y);

        cursor.points.forEach(point => {
            context.lineTo(point.x, point.y);
        });

        context.fillStyle = 'green';
        context.fill();
        context.closePath();
    }

    function drawBorder() {
        context.beginPath();
        context.rect(0, 0, getWindow().x, getWindow().y);
        context.fillStyle = '#CCCCCC';
        context.fill();
        context.closePath();
    }

    function drawField() {
        context.beginPath();
        context.rect(BORDER - 1, BORDER - 1, getWindow().x - (BORDER - 1) * 2, getWindow().y - (BORDER - 1) * 2);
        context.fillStyle = 'black';
        context.fill();
        context.closePath();
    }

    function circle(position, radius, fill) {
        context.beginPath();
        context.arc(position.x, position.y, radius, 0, 2 * Math.PI);
        context.fillStyle = fill || 'red';
        context.fill();
        context.closePath();
    }

    function translate(currentPosition, length, direction) {
        let moveX = length * Math.cos(direction);
        let moveY = length * Math.sin(direction);

        return {x: currentPosition.x + moveX, y: currentPosition.y + moveY}
    }

    function rotate(currentPosition, degree, center) {
        const {x, y} = currentPosition;
        const c = center;
        const _degree = (degree);
        const _x = (x - c.x) * Math.cos(_degree) - (y - c.y) * Math.sin(_degree) + c.x;
        const _y = (x - c.x) * Math.sin(_degree) + (y - c.y) * Math.cos(_degree) + c.y;

        return {x: _x, y: _y}
    }

    function outX(x, offset = 0) {
        return x < BORDER + offset || x > getWindow().x - BORDER - offset;
    }

    function outY(y, offset = 0) {
        return y < BORDER + offset || y > getWindow().y - BORDER - offset;
    }

    function toDegrees(angle) {
        return angle * (180 / Math.PI);
    }

    function toRadians(angle) {
        return angle * (Math.PI / 180);
    }

    function getRandomDirection() {
        return toRadians(Math.round(Math.random() * 360));
    }

    function getDirection(direction) {
        return toRadians({
            right: 0,
            up: 270,
            left: 180,
            down: 90,
        }[direction]);
    }

    function getPosition(position) {
        switch (position) {
            case 'middle':
                return {
                    x: (GRID_WIDTH / 2) * getRatio().x,
                    y: (GRID_HEIGHT / 2) * getRatio().y,
                }
            case 'begin':
                return {
                    x: 0,
                    y: 0,
                }
            case 'end':
                return {
                    x: GRID_WIDTH,
                    y: GRID_HEIGHT,
                }
        }
    }

    function getWindow() {
        return {x: window.innerWidth, y: window.innerHeight}
    }

    function getRatio() {
        return {x: window.innerWidth / GRID_WIDTH, y: window.innerHeight / GRID_HEIGHT};
    }
})();
