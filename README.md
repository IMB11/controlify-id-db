# Installation Instructions

Requires nodejs 19+ and pm2:


### Installing PM2

```
npm install --global pm2
```

### Installing Project

Run this in the project root.

```
npm install
```

### Running the pm2 instance

Launching the instance:

```
pm2 start npm --name "Controlify Identification API" -- start
```

Making sure it restarts if the server restarts/shuts down suddenly:

```
pm2 startup # follow the instructions.
```

Saving the instances for startup:

```
pm2 save
```

