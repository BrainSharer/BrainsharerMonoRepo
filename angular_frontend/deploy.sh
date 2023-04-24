#!/bin/bash

rm -rvf dist/brainsharer_frontend/*
ng build --configuration=production
rm -vf brainsharer.frontend.tar.gz
cd dist/brainsharer_frontend
tar zcvf ../../brainsharer.frontend.tar.gz *
cd ../../
