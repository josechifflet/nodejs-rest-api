CREATE TABLE
    "session" (
        "id" character varying NOT NULL,
        "expiresAt" integer NOT NULL,
        "data" character varying NOT NULL,
        CONSTRAINT "PK_f55da76ac1c3ac420f444d2ff11" PRIMARY KEY ("id")
    );
CREATE TABLE
    "attendance" (
        "PK" SERIAL NOT NULL,
        "ID" uuid NOT NULL DEFAULT uuid_generate_v4 (),
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
        "userPK" integer NOT NULL,
        CONSTRAINT "UQ_275e2c4503111219b4953b953d1" UNIQUE ("ID"),
        CONSTRAINT "PK_653ddc2f054c8cd394ff5c2b632" PRIMARY KEY ("PK")
    );
CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'admin');
CREATE TABLE
    "user" (
        "PK" SERIAL NOT NULL,
        "ID" uuid NOT NULL DEFAULT uuid_generate_v4 (),
        "name" character varying NOT NULL,
        "lastname" character varying NOT NULL,
        "username" character varying NOT NULL,
        "email" character varying NOT NULL,
        "phoneNumber" character varying NOT NULL,
        "password" character varying NOT NULL,
        "totpSecret" character varying NOT NULL,
        "fullName" character varying NOT NULL,
        "confirmationCode" character varying,
        "forgotPasswordCode" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'user',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_f0eace201126c1c8be2ae32fd22" UNIQUE ("ID"),
        CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"),
        CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"),
        CONSTRAINT "UQ_f2578043e491921209f5dadd080" UNIQUE ("phoneNumber"),
        CONSTRAINT "UQ_18f7354ddbd40596539ba9a40ad" UNIQUE ("confirmationCode"),
        CONSTRAINT "UQ_7aa69905302b42689211f9bb91e" UNIQUE ("forgotPasswordCode"),
        CONSTRAINT "PK_01f79bfc1078e57f3962d8a29ef" PRIMARY KEY ("PK")
    );
CREATE TABLE
    "cache" (
        "id" character varying NOT NULL,
        "value" character varying,
        "data" jsonb DEFAULT '{}',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_c1aeeb8cd7a17a7698cf64e1a8d" PRIMARY KEY ("id")
    );
ALTER TABLE "attendance"
ADD CONSTRAINT "FK_fe9a18635b30a90050c37d69dc9" FOREIGN KEY ("userPK") REFERENCES "user" ("PK") ON DELETE NO ACTION ON UPDATE NO ACTION;