export class Player {
    x: number = 400;
    y: number = 300;
    speed: number = 200;

    move(dir: number, dt: number) {
        this.x += dir * this.speed * dt;
    }
}
