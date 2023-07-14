

import { ComboView } from "./js/components/ComboView";

import { Note } from "./js/components/Note";

import { JudgeView } from "./js/components/JudgeView";
//@ts-expect-error
import { Bomb } from "./js/UI/Bomb.mjs";
//@ts-expect-error
import { MusicPlayer } from "./js/MusicPlayer.mjs";

//@ts-expect-error
import { GrooveGauge } from "./js/Gauges/GrooveGauge.mjs";

import bmeFile from "./resource/demo/darksamba/_dark_sambaland_a.bme";

//import {JUDGES} from '/jsons/judge.json' 

//HTML側Bodyのonlordに書かれているので、この関数はBodyの読み込みが終わったら呼ばれるはず
window.startClock = () => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const game = new Game(canvas);
}

class Game {

    CANVAS: HTMLCanvasElement;
    CTX: CanvasRenderingContext2D;

    keypresscount: number;

    judgeview: JudgeView;
    conboView: ComboView;

    notes: Note[];
    bombs: Bomb[];

    startGame: (e: KeyboardEvent) => void;
    GAUGE: GrooveGauge;

    keypressed!: (e: KeyboardEvent) => void;

    exitMain: any;

    /** Game開始のための準備、いろいろ読み込んでstartGameを可能にする。*/
    constructor(canvas : HTMLCanvasElement) {

        /** @readonly */
        this.CANVAS = canvas;

        /** @readonly */
        this.CTX = this.CANVAS.getContext('2d') as CanvasRenderingContext2D;

        if(!this.CTX){
            throw new Error('canvas?');
        }

        this.keypresscount = 0;

        this.judgeview = new JudgeView(this.CTX);
        this.conboView = new ComboView(this.CTX);

        this.notes = [];

        // 譜面をもとに、ノーツを配置する

        // まずChartPurserとTextSplitterを実体化する
        // TextSplitterにimportしたファイルを渡して、帰ってきたものをChartPurserに渡す
        // Notesが帰ってくる。NotesはNoteの集合を表現するクラス。

        const NOTE_WIDTH = 80;

        for (let i = 0; i < 4000; i++) {
            this.notes.push(new Note(this.CTX, (i + 1) % 4, 4448 + (278 * i), 1, NOTE_WIDTH, 120));
            this.notes.push(new Note(this.CTX, (i + 2) % 4, 4448 + (278 * i), 1, NOTE_WIDTH, 120));
            this.notes.push(new Note(this.CTX, (i + 3) % 4, 4448 + (278 * i), 1, NOTE_WIDTH, 120));
        }

        /** @type {Array.<Bomb>} */
        this.bombs = [];

        for (let i = 0; i < 4; i++) {
            this.bombs.push(new Bomb(this.CTX, i, 0, NOTE_WIDTH));
        }

        this.startGame = (e) => { this._startGame(e) };
        document.addEventListener('keydown', this.startGame);

        //ゲームが実際に起動されるまで表示される待ち受け画面。
        this.inputWaitingscreen();
    }

    //実際にゲームが始まるタイミングで呼ばれる
    _startGame(e : KeyboardEvent) {

        /** @type {Object.<Judge>} */
        // JUDGES

        this.GAUGE = new GrooveGauge(this.CTX);

        document.removeEventListener('keydown', this.startGame);

        //ノーツの開始地点を記録
        //TODO performance.nowが使えなければDate.nowを取得
        const NOW = performance.now();
        this.notes.forEach(note=>note.begin(NOW));

        this.keypressed = (e) => { this._keypressed(e) };
        document.addEventListener('keydown', this.keypressed);

        const musicplayer = new MusicPlayer();
        musicplayer.play();

        this.frame();

    }

    //gameが実際に始まる前までに表示し続ける表示
    inputWaitingscreen() {

        this.writeBackGround();

        this.CTX.fillStyle = 'rgb( 255, 102, 102)';
        this.CTX.font = "18px serif";
        
        this.CTX.fillText("キーボード押すと音が鳴るよ", 50, 100);
        this.CTX.fillText("爆音なので注意", 50, 120);
    }

    //再帰的なメインループ
    frame = () => {

        //window.cancelAnimationFrame(this.exitMain)でメインループを抜けられる
        this.exitMain = window.requestAnimationFrame(this.frame);

        const NOW = performance.now();

        //画面のリフレッシュ
        this.CTX.clearRect(0, 0, 3000, 3000);

        this.writeBackGround();

        this.GAUGE.draw();

        this.bombs.forEach(bomb => bomb.writebomb())

        this.judgeview.draw();
        this.conboView.draw();

        //存在するすべてのNoteオブジェクトの時を進める

        for (let i = 0; i < this.notes.length; i++) {
            this.notes[i].draw(NOW);
            if (this.notes[i].isOVER(NOW)) {
                this.judgeview.judge = "OVER";
                this.GAUGE.judge = "OVER";
                this.conboView.resetConboCount();
                this.notes.splice(i, 1);
            };
        }

    }

    writeBackGround() {
        this.CTX.fillStyle = 'rgb( 0, 0, 0)';
        this.CTX.fillRect(0, 0, this.CANVAS.width, this.CANVAS.height);
        //判定位置生成
        this.CTX.fillStyle = 'rgb( 0, 255, 0)';
        this.CTX.fillRect(0, 502, this.CANVAS.width, 5);
    }

    //何らかのキーが押されている時呼ばれます
    _keypressed(e : KeyboardEvent) {

        console.log(e.key);
        if (e.repeat === false) {
            if (e.code === 'KeyD') {
                this.judgeTiming(0);
            } else if (e.code === 'KeyF') {
                this.judgeTiming(1);
            } else if (e.code === 'KeyJ') {
                this.judgeTiming(2);
            } else if (e.code === 'KeyK') {
                this.judgeTiming(3);
            }
        }
        this.keypresscount += 1;
        return false;
    }

    judgeTiming(l : number) {

        //TODO クッソ雑に全ノーツを判定します。

        for (let i = 0; i < this.notes.length; i++) {
            if (this.notes[i].no === l) {

                //bは短縮のためのインスタンスな変数です。

                const b = this.notes[i].falltime + (globalThis.performance.now() - this.notes[i].getSTART_TIME())

                if (50 > b && -50 < b) {
                    console.log(`${l}is GREAT!, i think it is${b}`);
                    this.judgeview.judge = "GREAT";
                    this.GAUGE.judge = "GREAT";
                    this.conboView.addConboCount();
                    this.notes.splice(i, 1);
                } else if (100 > b && -100 < b) {
                    this.judgeview.judge = "GOOD";
                    this.GAUGE.judge = "GOOD";
                    this.conboView.addConboCount();
                    this.notes.splice(i, 1);
                } else if (200 > b && -200 < b) {
                    this.judgeview.judge = "bad";
                    this.GAUGE.judge = "BAD";
                    this.conboView.resetConboCount();
                    this.notes.splice(i, 1);
                } else if (210 > b && -210 < b) {
                    this.judgeview.judge = "POOR";
                    this.notes.splice(i, 1);
                }

            }

        }

        this.bombs[l].setbomblife(50);

        return;
    }

}