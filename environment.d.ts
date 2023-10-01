declare global {
    namespace NodeJS {
        interface ProcessEnv {
            // development
            DEV: 'true' | 'false';

            // bot stuff
            TOKEN: string;
            BOT_OWNER: string;
        }
    }
}

export {}