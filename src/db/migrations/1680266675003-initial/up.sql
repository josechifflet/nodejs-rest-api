CREATE TABLE
    "user" (
        "userPK" SERIAL NOT NULL,
        "userID" uuid NOT NULL DEFAULT uuid_generate_v4 (),
        "username" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phoneNumber" character varying NOT NULL,
        "password" character varying NOT NULL,
        "name" character varying NOT NULL,
        "lastname" character varying NOT NULL,
        "totpSecret" character varying NOT NULL,
        "confirmationCode" character varying,
        "forgotPasswordCode" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_46d78688eda2476cb18f7eae8a5" UNIQUE ("userID"),
        CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"),
        CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"),
        CONSTRAINT "UQ_f2578043e491921209f5dadd080" UNIQUE ("phoneNumber"),
        CONSTRAINT "UQ_18f7354ddbd40596539ba9a40ad" UNIQUE ("confirmationCode"),
        CONSTRAINT "UQ_7aa69905302b42689211f9bb91e" UNIQUE ("forgotPasswordCode"),
        CONSTRAINT "PK_4db72b0bdf14a8f744b7617b599" PRIMARY KEY ("userPK")
    );
CREATE TABLE
    "attendance" (
        "attendancePK" SERIAL NOT NULL,
        "attendanceID" uuid NOT NULL DEFAULT uuid_generate_v4 (),
        "timeEnter" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ipAddressEnter" character varying,
        "deviceEnter" character varying,
        "remarksEnter" character varying,
        "timeLeave" TIMESTAMP WITH TIME ZONE,
        "ipAddressLeave" character varying,
        "deviceLeave" character varying,
        "remarksLeave" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userPK" integer,
        "profilePK" integer,
        CONSTRAINT "UQ_f18639c4fdebb741070f05fab42" UNIQUE ("attendanceID"),
        CONSTRAINT "PK_b109930c1ea2a719f40792530ea" PRIMARY KEY ("attendancePK")
    );
CREATE TABLE
    "trader" (
        "traderPK" SERIAL NOT NULL,
        "traderID" uuid NOT NULL DEFAULT uuid_generate_v4 (),
        "nickname" character varying NOT NULL,
        "futureUid" integer,
        "encryptedUid" character varying NOT NULL,
        "rank" integer NOT NULL,
        "pnl" numeric NOT NULL,
        "roi" numeric NOT NULL,
        "positionShared" boolean NOT NULL,
        "updateTime" character varying NOT NULL,
        CONSTRAINT "UQ_0c7e8de6fec7cd59f3a3f0c5ed4" UNIQUE ("traderID"),
        CONSTRAINT "PK_e3867e8b5100907a1bb59be4ee5" PRIMARY KEY ("traderPK")
    );
CREATE TABLE
    "position" (
        "positionPK" SERIAL NOT NULL,
        "positionID" uuid NOT NULL DEFAULT uuid_generate_v4 (),
        "symbol" character varying NOT NULL,
        "entryPrice" numeric NOT NULL,
        "markPrice" numeric NOT NULL,
        "pnl" numeric NOT NULL,
        "roe" numeric NOT NULL,
        "updateTime" character varying NOT NULL,
        "amount" numeric NOT NULL,
        "leverage" integer NOT NULL,
        "traderTraderPK" integer,
        CONSTRAINT "UQ_18815b04811233b4f62347df723" UNIQUE ("positionID"),
        CONSTRAINT "PK_c2306ccdd4472f298c6b4c50641" PRIMARY KEY ("positionPK")
    );
CREATE TABLE
    "cache" (
        "id" character varying NOT NULL,
        "value" character varying,
        "data" jsonb DEFAULT '{}',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_c1aeeb8cd7a17a7698cf64e1a8d" PRIMARY KEY ("id")
    );
CREATE TABLE
    "session" (
        "id" character varying NOT NULL,
        "expiresAt" integer NOT NULL,
        "data" character varying NOT NULL,
        CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id")
    );
ALTER TABLE "attendance"
ADD CONSTRAINT "FK_fe9a18635b30a90050c37d69dc9" FOREIGN KEY ("userPK") REFERENCES "user" ("userPK") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "position"
ADD CONSTRAINT "FK_9edd4d38e5aac344d9602c400c4" FOREIGN KEY ("traderTraderPK") REFERENCES "trader" ("traderPK") ON DELETE NO ACTION ON UPDATE NO ACTION;