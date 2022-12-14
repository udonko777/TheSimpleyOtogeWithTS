'use strict';

// Enable the passage of the 'this' object through the JavaScript timers

var __nativeST__ = window.setTimeout, __nativeSI__ = window.setInterval;

window.setInterval = function (vCallback, nDelay /*, argumentToPass1, argumentToPass2, etc. */) {
    var oThis = this, aArgs = Array.prototype.slice.call(arguments, 2);
    return __nativeSI__(vCallback instanceof Function ? function () {
        vCallback.apply(oThis, aArgs);
    } : vCallback, nDelay);
};

//ここグローバルになってるので可能ならスコープを狭めたいっす。
let IntervID;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

//bomの描画関連。雑な実装なのでどうにかしたい。
var bomb = [];
var judgeview;
var comboview;

class GameEvent {

    constructor() { }

    begin(starttime) {
        this.START_TIME = starttime;
    }

    writing(clock) { }
}

class Note extends GameEvent {

    /** @param {Number} no 0 at left */
    constructor(ctx, no, falltime, hispeed, NOTE_WIDTH, FIRST_BPM) {

        super();
        //this.canvas = canvas;
        this.ctx = ctx;
        this.no = no;
        this.hispeed = hispeed;
        this.NOTE_WIDTH = NOTE_WIDTH;
        this.falltime = -falltime;
        //BPMが途中で変化するタイプの曲において既に
        this.beforeTime = 0;
        //scrollspeed 1 : 120 bpm
        this.scrollspeedforbpm = FIRST_BPM / 120;
        //(落ちるまでの時間 + 現在の時間 - 開始時間) / ハイスピ + 判定位置
        //このタイミングで現在の時間と開始時間が等しいので0
        this.y = ((this.falltime + 0) / hispeed) + 500;
    }

    getSTART_TIME() {
        return this.START_TIME;
    }

    writing(clock) {

        //ノーツの色の設定
        this.ctx.fillStyle = '#DD7070';

        this.y = ((this.falltime + this.beforeTime + ((clock.getTime() - this.START_TIME) * this.scrollspeedforbpm)) / this.hispeed) + 500;
        //ノーツの描画
        this.ctx.fillRect(this.no * this.NOTE_WIDTH, this.y, this.NOTE_WIDTH, 10);
        //console.log(this.y);
    }

    changeBpm(clock, BPM) {
        this.beforeTime = this.beforeTime + (clock.getTime() - this.START_TIME) * this.scrollspeedforbpm;
        this.scrollspeedforbpm = BPM / 120;
        console.log("はいは～い呼び出されたよぉ");
    }


    isOVER(clock) {
        //無視された時の処理(OVER判定)

        if (501 < this.falltime + (clock.getTime() - this.START_TIME)) {
            return true;
        }
        else {
            return false;
        }
    }
}

class BpmChanger extends GameEvent {

    constructor(falltime, BPM, notes) {
        super();

        this.falltime = falltime;
        this.BPM = BPM;
        this.notes = notes;
    }

    writing(clock) {
        if (this.falltime === clock.getTime() - this.START_TIME) {
            return (true, this.BPM);
        }
        return (false, this.BPM);
    }
}

class Bomb {

    constructor(ctx, no, bomblife, NOTE_WIDTH) {
        this.bomblife = bomblife;
        this.ctx = ctx;
        this.no = no;
        this.NOTE_WIDTH = NOTE_WIDTH;
    }

    writebomb() {
        if (this.bomblife > 0) {
            this.ctx.fillStyle = `rgba( 100, 105, 200,${this.bomblife / 50})`;
            this.ctx.fillRect(this.no * this.NOTE_WIDTH, 480 + (this.bomblife / 4), this.NOTE_WIDTH, 5);
            this.bomblife -= 1;
        } else {

        }
        return false;
    }

    setbomblife(bomblife) {
        this.bomblife = bomblife;
    }
}

class JudgeView {

    constructor(ctx) {
        //judge == {N/A,poor,poor,good,great,great}
        this.ctx = ctx;
        this.judgeName = "N/A";
        this.x = 70;
        this.y = 370;
    }

    /**
     * @param {String} judgeName
     */
    set judge(judgeName) {
        switch (judgeName) {
            case "OVER":
                this.judgeName = "OVER";
                break;
            case "POOR":
                this.judgeName = "POOR";
                break;
            case "BAD":
                this.judgeName = "BAD";
                break;
            case "GOOD":
                this.judgeName = "GOOD";
                break;
            case "GREAT":
                this.judgeName = "GREAT";
                break;
            default:
                console.log("i dont know this judgeName");
                break;
        }
    }

    writejudge() {
        switch (this.judgeName) {
            case "N/A":
                break
            case "OVER":
                this.ctx.fillStyle = 'rgb( 255, 102, 102)';
                this.ctx.font = "48px serif";
                this.ctx.fillText("POOR", this.x, this.y);
                break
            case "POOR":
                this.ctx.fillStyle = 'rgb( 255, 102, 102)';
                this.ctx.font = "48px serif";
                this.ctx.fillText("POOR", this.x, this.y);
                break
            case "BAD":
                this.ctx.fillStyle = 'rgb( 255, 102, 102)';
                this.ctx.font = "48px serif";
                this.ctx.fillText("BAD", this.x, this.y);
                break
            case "GOOD":
                this.ctx.fillStyle = 'rgb( 255, 128, 0)';
                this.ctx.font = "48px serif";
                this.ctx.fillText("GOOD", this.x, this.y);
                break
            case "GREAT":
                this.ctx.fillStyle = 'rgb( 0, 128, 255)';
                this.ctx.font = "48px serif";
                this.ctx.fillText("GREAT", this.x, this.y);
                break
        }
    }
}

class ComboView {

    constructor(ctx) {
        this.ctx = ctx;
        this.combocount = 0;
    }

    addConboCount() {
        this.combocount += 1;
    }

    resetConboCount() {
        this.combocount = 0;
    }

    writeConboCount() {
        if (this.combocount > 0) {
            this.ctx.fillStyle = 'rgb( 255, 102, 102)';
            this.ctx.font = "48px serif";
            this.ctx.fillText(this.combocount, 10, 100);
        } else {
            console.log("comboocunt is zero");
        }
    }
}

//このまま使わない事(実装は子クラス)
class Gauge {

    constructor(ctx) {

        //描画関連のパラメータ

        this.ctx = ctx;

        //0 <= groove <= 65536
        this.groove;
        this.MAXGROOVE = 65536;

        this.STATEX = 0;
        this.STATEY = 0;

        this.GAUGE_HEIGHT = 30;
        this.GAUGE_WIDTH = 320;

        this.GAUGE_VOID_WIDTH = 20;
        this.GAUGE_BOX_NUMBER = 20;

        //ゲージの計算関連
        this.PGREAT;
        this.GREAT;
        this.GOOD;
        this.BAD;
        this.POOR;
        this.OVER;
        this.BREAK;
        this.judge;

        //grooveが0の時ゲームを終了させるか
        this.IS_TOLERANT = false;
    }

    writeGauge() {

        this.existarea = (this.GAUGE_WIDTH - this.GAUGE_VOID_WIDTH) / this.GAUGE_BOX_NUMBER;
        this.voidarea = this.GAUGE_VOID_WIDTH / this.GAUGE_BOX_NUMBER;
        this.usedarea = 0;
        for (let i = 0; i < this.GAUGE_BOX_NUMBER; i++) {
            this.writebox(this.boxcolor(i), this.usedarea + this.STATEX, this.STATEY, this.existarea, this.GAUGE_HEIGHT);
            this.usedarea = this.usedarea + this.existarea + this.voidarea;
        }
    }

    //外部から呼び出せないようにすべき
    writebox(color, x, y, boxwidth, boxheight) {
        //ノーツの色の設定
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, boxwidth, boxheight);
    }

    boxcolor(no) {
    }

}

class GrooveGauge extends Gauge {
    constructor(ctx) {
        super(ctx);

        this.groove = 22220;
        this.GAUGE_BOX_NUMBER = 24;

        this.GAUGE_BOX_AS_GROOVE = this.MAXGROOVE / this.GAUGE_BOX_NUMBER;

        this.GREAT = 1000;
        this.GOOD = 100;
        this.BAD = -1200;
        this.OVER = -2000;
    }

    boxcolor(no) {
        this.no = no;
        this.enableboxnumber = Math.floor(this.groove / this.GAUGE_BOX_AS_GROOVE);

        if (this.no < this.enableboxnumber) {
            this.color = '#3ad132';
        } else {
            this.color = '#444444';
        }
        return this.color;
    }



    /**
     * @param {String} judgeName
     */
    set judge(judgeName) {
        switch (judgeName) {
            case "PGREAT":
                this.groove += this.PGREAT;
                break;
            case "GREAT":
                this.groove += this.GREAT;
                break;
            case "GOOD":
                this.groove += this.GOOD;
                break;
            case "BAD":
                this.groove += this.BAD;
                break;
            case "POOR":
                this.groove += this.POOR;
                break;
            case "OVER":
                this.groove += this.OVER;
                break;
            case "BREAK":
                this.groove += this.BREAK;
                break;

            default:
                console.log("i dont know this judgeName");
                break;
        }
        if (this.groove < 0) {
            this.groove = 0;
        }
        if (this.groove > this.MAXGROOVE) {
            this.groove = this.MAXGROOVE;
        }
    }
}

class MusicPlayer {

    constructor() {
        //れとろなぶらうざ用
        const AudioContext = window.AudioContext || window.webkitAudioContext;

        this.audioContext = new AudioContext();

        this.audioElement = document.querySelector('audio');
        this.music = this.audioContext.createMediaElementSource(this.audioElement);

        this.music.connect(this.audioContext.destination);
    }

    play() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        } else {
            this.audioElement.play();
        }
    }

}

//自分自身を一度呼び出す関数っす。
(function () {

}());

//HTML側Bodyのonlordに書かれているので、この関数はBodyの読み込みが終わったら呼ばれるはず
function startClock() {
    const game = new Game();
}

class Game {

    //Game開始のための準備、いろいろ読み込んでstartGameを可能にする。
    constructor() {

        this.keypresscount = 0;

        judgeview = new JudgeView(ctx);
        comboview = new ComboView(ctx);

        this.notes = [];

        //譜面をもとに、ノーツを配置する

        const NOTE_WIDTH = 80;

        for (let i = 0; i < 7000; i++) {
            this.notes.push(new Note(ctx, (i + 1) % 4, 4448 + (278 * i), 1, NOTE_WIDTH, 120));
            this.notes.push(new Note(ctx, (i + 2) % 4, 4448 + (278 * i), 1, NOTE_WIDTH, 120));
            this.notes.push(new Note(ctx, (i + 3) % 4, 4448 + (278 * i), 1, NOTE_WIDTH, 120));
        }

        //this.bpmchanger = new BpmChanger(3000, 60, this.notes);

        for (let i = 0; i < 4; i++) {
            bomb.push(new Bomb(ctx, i, 0, NOTE_WIDTH));
        }

        this.startGame = (e) => { this._startGame(e) };
        document.addEventListener('keydown', this.startGame);

        //ゲームが実際に起動されるまで表示される待ち受け画面。
        this.inputWaitingscreen();
    }

    //実際にゲームが始まるタイミングで呼ばれる
    _startGame(e) {
        this.clock = new Date();

        //TEST!!!!!!!!!!!TEST!!!!!!!!!!!!!!!!!!!TEST

        this.GAUGE = new GrooveGauge(ctx);

        //TEST!!!!!!!!!!!TEST!!!!!!!!!!!!!!!!!!!TEST


        //この関数へのアクセスを消す
        document.removeEventListener('keydown', this.startGame);


        //ここnoteの数が増えてくるとどんどんずれる原因になるかも要検証

        const NOTES_LENGTH = this.notes.length;

        for (let i = 0; i < NOTES_LENGTH; i++) {
            this.notes[i].begin(this.clock.getTime());
        }

        this.keypressed = (e) => { this._keypressed(e) };
        document.addEventListener('keydown', this.keypressed);

        let musicplayer = new MusicPlayer();
        musicplayer.play();

        //let START_TIME = this.clock.getTime();

        this.IntervID = window.setInterval(this.frame.bind(this), 4);

    }

    //gameが実際に始まる前までに表示し続ける表示を用意します
    inputWaitingscreen() {

        this.writeBackGround();

        ctx.fillStyle = 'rgb( 255, 102, 102)';
        ctx.font = "18px serif";
        ctx.fillText("キーボード押すと音が鳴るよ", 50, 100);
        ctx.fillText("爆音なので注意", 50, 120);
    }

    //ここに、一フレームにつき行う動作を描く
    frame() {
        this.clock = new Date();
        //画面のリフレッシュ
        ctx.clearRect(0, 0, 3000, 3000);
        //背景生成
        this.writeBackGround();

        //!!!!!!TEST
        this.GAUGE.writeGauge();
        //TEST


        //ボム生成
        for (let i = 0; i < bomb.length; i++) {
            bomb[i].writebomb();
        }

        //判定表示
        judgeview.writejudge();
        comboview.writeConboCount();

        //存在するすべてのNoteオブジェクトの時を進める

        for (let i = 0; i < this.notes.length; i++) {
            this.notes[i].writing(this.clock);
            if (this.notes[i].isOVER(this.clock)) {
                judgeview.judge = "OVER";
                this.GAUGE.judge = "OVER";
                comboview.resetConboCount();
                this.notes.splice(i, 1);
            };
        }

        //console.log((clock.getTime() - starttime) / 100);
    }

    writeBackGround() {
        ctx.fillStyle = 'rgb( 0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        //判定位置生成
        ctx.fillStyle = 'rgb( 0, 255, 0)';
        ctx.fillRect(0, 502, canvas.width, 5);
    }

    //何らかのキーが押されている時呼ばれます
    _keypressed(e) {

        console.log(e.key);
        if (e.repeat === false) {
            if (e.code === 'KeyD') {
                //console.log("d is plassed,");
                this.judgeTiming(0);
            } else if (e.code === 'KeyF') {
                //console.log("f is plassed,");
                this.judgeTiming(1);
            } else if (e.code === 'KeyJ') {
                //console.log("j is plassed,");
                this.judgeTiming(2);
            } else if (e.code === 'KeyK') {
                //console.log("k is plassed,");
                this.judgeTiming(3);
            }
        }
        this.keypresscount += 1;
        return false;
    }

    /** @param {Number} l */
    judgeTiming(l) {

        //TODO クッソ雑に全ノーツを判定します。

        for (let i = 0; i < this.notes.length; i++) {
            if (this.notes[i].no == l) {

                //bは短縮のためのインスタンスな変数です。

                const b = (this.notes[i].falltime + (this.clock.getTime() - this.notes[i].getSTART_TIME()))

                if (50 > b && -50 < b) {
                    console.log(`${l}is GREAT!, i think it is${b}`);
                    console.log("GREAT");
                    judgeview.judge = "GREAT";
                    this.GAUGE.judge = "GREAT";
                    comboview.addConboCount();
                    this.notes.splice(i, 1);
                } else if (100 > b && -100 < b) {
                    console.log("good");
                    judgeview.judge = "GOOD";
                    this.GAUGE.judge = "GOOD";
                    comboview.addConboCount();
                    this.notes.splice(i, 1);
                } else if (200 > b && -200 < b) {
                    console.log("bad");
                    judgeview.judge = "bad";
                    this.GAUGE.judge = "BAD";
                    comboview.resetConboCount();
                    this.notes.splice(i, 1);
                } else if (210 > b && -210 < b) {
                    console.log("poor");
                    judgeview.judge = "POOR";
                    this.notes.splice(i, 1);
                }

            } else { }

        }

        bomb[l].setbomblife(50);

        return false;
    }

}