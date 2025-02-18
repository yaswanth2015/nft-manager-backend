-- CreateTable
CREATE TABLE "CollectionOwners" (
    "id" SERIAL NOT NULL,
    "collectionAddress" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "CollectionOwners_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CollectionOwners" ADD CONSTRAINT "CollectionOwners_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
