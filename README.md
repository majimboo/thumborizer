Thumborizer
===========

[![Build Status](https://travis-ci.org/majimboo/thumborizer.png?branch=master)](https://travis-ci.org/majimboo/thumborizer)

### Install MongoDB

	apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10
	echo "deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen" | tee -a /etc/apt/sources.list.d/10gen.list
	apt-get -y update
	apt-get -y install mongodb-10gen

### Install GraphicsMagick

	sudo apt-get install graphicsmagick libgraphicsmagick1-dev

### Install OpenCV

	sudo apt-get install libopencv-dev

#### Setup

    git clone git@github.com:majimboo/thumborizer.git thumborizer
    cd thumborizer && npm install -g

#### Usage

	thumborizer -c /path/to/config.json

Now go to your browser

    http://localhost:8888/avatar/100x100/http://med.stanford.edu/ism/2012/downloads/face-blind-blackwell.jpg