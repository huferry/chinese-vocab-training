# Setting up to deploy to Firebase + Neon

## Firebase Project

Project URL: https://console.firebase.google.com/project/chinese-vocabulary-train-1a187


## Neon Project

| Field       | Value                                      |
|-------------|--------------------------------------------|
| Project     | chinese-vocabulary-training                |
| Project ID  | delicate-flower-61529384                   |
| Region      | aws-ap-southeast-1 (Singapore)             |
| Branch      | main (`br-noisy-hill-azdzif9o`)            |
| Database    | neondb                                     |
| Role        | neondb_owner                               |

## Connection Strings

**Direct** (use for migrations):
```
postgresql://neondb_owner:npg_rN4FCteh3vzq@ep-round-art-az7lc43d.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

**Pooled** (use for the app / runtime):
```
postgresql://neondb_owner:npg_rN4FCteh3vzq@ep-round-art-az7lc43d-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Environment Variables

Add these to your `.env` (and to Firebase/hosting env config):

```env
DATABASE_URL=postgresql://neondb_owner:npg_rN4FCteh3vzq@ep-round-art-az7lc43d-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DATABASE_URL_DIRECT=postgresql://neondb_owner:npg_rN4FCteh3vzq@ep-round-art-az7lc43d.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
PGHOST=ep-round-art-az7lc43d.c-3.ap-southeast-1.aws.neon.tech
PGDATABASE=neondb
PGUSER=neondb_owner
PGPASSWORD=npg_rN4FCteh3vzq
```

