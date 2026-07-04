{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShellNoCC {
  packages = with pkgs; [
    # shell.nix
    nixfmt

    # server
    go
    gopls

    # docs/
    # vacuum; newer version installed using Go tool
    prettier
    yaml-language-server
  ];
}
