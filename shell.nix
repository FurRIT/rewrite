{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShellNoCC {
  packages = with pkgs; [
    # shell.nix
    nixfmt

    # docs/
    go
    prettier
    yaml-language-server
  ];
}
