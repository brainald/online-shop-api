/*
  Warnings:

  - Made the column `cartId` on table `carts_items` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "carts_items" DROP CONSTRAINT "carts_items_cartId_fkey";

-- AlterTable
ALTER TABLE "carts_items" ALTER COLUMN "cartId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "carts_items" ADD CONSTRAINT "carts_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
