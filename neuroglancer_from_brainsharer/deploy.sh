#!/bin/bash

rm -vf dist/min/*
npm run build-brainsharer
rm -vf brainsharer.neuroglancer.tar.gz
cd dist/min/
tar zcvf ../../brainsharer.neuroglancer.tar.gz *
cd ../../
