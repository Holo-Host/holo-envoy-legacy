{ pkgs ? import ./pkgs.nix {} }:

with pkgs;

{
  holo-envoy = stdenv.mkDerivation rec {
    name = "holo-envoy";
    src = gitignoreSource ./.;
    
    nativeBuildInputs = [
      holochain-cli
      holochain-conductor
      nodejs-12_x
    ];
    
    preConfigure = ''
      cp -Lr ${npmToNix { inherit src; }} node_modules
      chmod -R +w node_modules
      patchShebangs node_modules
    '';
    
    buildPhase = ''
      node_modules/typescript/bin/tsc -d
    '';
    
    installPhase = ''
      mkdir $out
      mv * $out
    '';
  };
}
