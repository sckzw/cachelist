# cachelist
Cache sniffer extension for Firefox

# GPM
~~~
URL Filter: videoplayback
Content-Type Filter: audio
ID Filter: id=(.+?)&
Index Filter: segment=(\d+)
Range Filter: range=(\d+)-(\d+)
~~~

# YT
~~~
URL Filter: videoplayback
Content-Type Filter: (audio|video)/webm
ID Filter: id=(.+?)&.+&mime=(.+?)%
Index Filter:
Range Filter: range=(\d+)-(\d+)
~~~

# SC
~~~
URL Filter: sndcdn
Content-Type Filter: ^audio/mpeg$
ID Filter: ([0-9A-Za-z]+)\.128\.mp3\?
Index Filter:
Range Filter: /(\d+?)/(\d+?)/
~~~
