#!/bin/bash

#!/bin/bash

if [ "$1" == "" ] || [ $# -gt 1 ]; then
    echo "Enter either 'production' or 'demo' as an argument."
	exit 0
fi

if ! [[ "$1" =~ ^(demo|production)$ ]]; then
    echo "Enter either 'production' or 'demo' as an argument."
	exit 0
fi

rm -vf dist/min/*
rm -vf *.tar.gz

if [ "$1" == "demo" ]; then
    BUILD="build-demo"
    PACKAGE="neuroglancer.demo.tar.gz"
fi

if [ "$1" == "production" ]; then
    BUILD="build-min"
    PACKAGE="neuroglancer.production.tar.gz"
fi



npm run $BUILD
cd dist/min/
tar zcvf ../../$PACKAGE *
cd ../../
