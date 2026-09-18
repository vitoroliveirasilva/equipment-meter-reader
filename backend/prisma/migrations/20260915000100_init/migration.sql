-- CreateEnum
CREATE TYPE "MeasureType" AS ENUM ('HOURMETER', 'ODOMETER');

-- CreateTable
CREATE TABLE
    "equipment" (
        "id" SERIAL NOT NULL,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(120) NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
    );

-- CreateTable
CREATE TABLE
    "reading" (
        "id" SERIAL NOT NULL,
        "uuid" UUID NOT NULL,
        "equipment_id" INTEGER NOT NULL,
        "measure_type" "MeasureType" NOT NULL,
        "measure_datetime" TIMESTAMP(3) NOT NULL,
        "measure_date" DATE NOT NULL,
        "detected_value" INTEGER NOT NULL,
        "confirmed_value" INTEGER,
        "confirmed" BOOLEAN NOT NULL DEFAULT false,
        "image_path" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "reading_pkey" PRIMARY KEY ("id")
    );

-- CreateIndex
CREATE UNIQUE INDEX "equipment_code_key" ON "equipment" ("code");

-- CreateIndex
CREATE UNIQUE INDEX "reading_uuid_key" ON "reading" ("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "reading_equipment_type_day_key" ON "reading" ("equipment_id", "measure_type", "measure_date");

-- CreateIndex
CREATE INDEX "reading_equipment_datetime_idx" ON "reading" ("equipment_id", "measure_datetime");

-- AddForeignKey
ALTER TABLE "reading" ADD CONSTRAINT "reading_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;