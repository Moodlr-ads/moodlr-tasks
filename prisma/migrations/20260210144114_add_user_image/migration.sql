-- DropForeignKey
ALTER TABLE "_TaskTags" DROP CONSTRAINT "_TaskTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_TaskTags" DROP CONSTRAINT "_TaskTags_B_fkey";

-- AlterTable
ALTER TABLE "_TaskTags" ADD CONSTRAINT "_TaskTags_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_TaskTags_AB_unique";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "image" TEXT;

-- AddForeignKey
ALTER TABLE "_TaskTags" ADD CONSTRAINT "_TaskTags_A_fkey" FOREIGN KEY ("A") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskTags" ADD CONSTRAINT "_TaskTags_B_fkey" FOREIGN KEY ("B") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
