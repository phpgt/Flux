These small media fixtures were created for the Flux palette example. They contain no external media.

`palette.svg` is a simple landscape. `palette.webm` is a six-second colour study, generated with:

```sh
ffmpeg -f lavfi -i 'color=c=0x244c78:s=320x180:r=12:d=6' \
  -vf 'drawbox=x=180:y=30:w=75:h=75:color=0xefb65d:t=fill,drawbox=x=0:y=125:w=320:h=55:color=0x457a78:t=fill,hue=H=t/2' \
  -c:v libvpx-vp9 -b:v 80k -an palette.webm
```
