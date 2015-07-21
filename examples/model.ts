export interface IA {
    name: string;
}

export interface IB {
    a: IA;       
}

export enum Enum {
    E1,
    E2
}

export class C extends D implements IB {
    public a: IA;

    public aArray: IA[];

    public aStringArray: string[];

    private pr: string;

    get pr2(): string {
        return this.pr;
    }

    set pr2(value: string) {
        this.pr = value;
    }

    constructor(private XXXX: string, public YYY: boolean) { }
    
    public doSomethingClass(): string {
        return "";
    }
}

export class D {}

export module SomeModule {
    export class F {}
    
    export function doSomething(): string {
        
    }
}